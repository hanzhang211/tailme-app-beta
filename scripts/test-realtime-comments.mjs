/**
 * 端到端验证 comments realtime：
 *  1. 用 anon key 订阅一个真实 post 的 comments INSERT
 *  2. 用 service_role 插一条评论
 *  3. 看 anon 那一端能否收到 payload
 *
 * 输出会明确告诉你哪一步出问题。
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").filter(l => l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const url    = env.NEXT_PUBLIC_SUPABASE_URL;
const anon   = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const svc    = env.SUPABASE_SERVICE_ROLE_KEY;

const sbAnon = createClient(url, anon);
const sbSvc  = createClient(url, svc, { auth: { persistSession: false } });

// 找一条 post + 一个 user 用于插评论
const { data: posts } = await sbSvc.from("posts").select("id").limit(1);
const { data: users } = await sbSvc.from("users").select("id").limit(1);
if (!posts?.length || !users?.length) {
  console.log("❌ 没有帖子或用户，无法测试");
  process.exit(1);
}
const postId = posts[0].id;
const userId = users[0].id;
console.log(`👉 测试 post_id=${postId}`);

let received = false;
let subState = "init";

const channel = sbAnon
  .channel(`test-post:${postId}:comments`)
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
    (payload) => {
      received = true;
      console.log(`✅ Realtime 回调触发！payload.new.id = ${payload.new?.id}, content = "${payload.new?.content}"`);
    }
  )
  .subscribe((status, err) => {
    subState = status;
    console.log(`📡 channel.subscribe status: ${status}${err ? `  err=${err.message}` : ""}`);
  });

// 等订阅就绪
console.log("⏳ 等 channel SUBSCRIBED ...");
const t0 = Date.now();
while (subState !== "SUBSCRIBED" && Date.now() - t0 < 5000) {
  await new Promise((r) => setTimeout(r, 100));
}
if (subState !== "SUBSCRIBED") {
  console.log(`❌ 5s 内 channel 未 SUBSCRIBED（当前: ${subState}），实时未建立`);
  process.exit(2);
}
console.log(`✅ channel SUBSCRIBED（用时 ${Date.now() - t0}ms）`);

// 用 service_role 插一条测试评论
console.log("📝 service_role 插入测试评论...");
const testContent = `[realtime-test ${Date.now()}]`;
const { data: inserted, error: insErr } = await sbSvc
  .from("comments")
  .insert({
    post_id: postId,
    user_id: userId,
    content: testContent,
    status: "visible",
  })
  .select()
  .single();
if (insErr) {
  console.log(`❌ 插入失败: ${insErr.message}`);
  process.exit(3);
}
console.log(`✅ 已插入 comment id=${inserted.id}`);

// 等 realtime 回调
console.log("⏳ 等 realtime 回调 (5s) ...");
await new Promise((r) => setTimeout(r, 5000));

// 清理测试数据
await sbSvc.from("comments").delete().eq("id", inserted.id);

if (received) {
  console.log("\n🎉 结论：comments Realtime 完全通——发布 publication / RLS / filter / WebSocket 全部正常");
  console.log("   如果 UI 上没看到新评论，问题在前端（state 没更新 / modal 没渲染）");
} else {
  console.log("\n❌ 结论：插入成功但 Realtime 回调没触发");
  console.log("   可能原因：");
  console.log("    1. comments 没在 supabase_realtime publication 里");
  console.log("    2. RLS 限制了 anon 接收变更（虽然有 read_visible_comments policy）");
  console.log("    3. filter 语法不被识别（不太可能，filter 正常）");
}

await sbAnon.removeChannel(channel);
process.exit(received ? 0 : 4);
