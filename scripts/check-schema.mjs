/**
 * 一次性诊断脚本：检查 community schema 部署状态。
 * 用 service_role key 绕过 RLS。
 *
 * 用法：node scripts/check-schema.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const out = { columns: {}, tables: {} };

/* 1. users 列 */
for (const col of ["id", "phone", "username", "role"]) {
  const { error } = await sb.from("users").select(col).limit(1);
  out.columns[col] = error ? `❌ ${error.message}` : "✅";
}

/* 2. 各表是否存在 */
const tables = ["chat_rooms", "messages", "posts", "post_likes", "comments", "reports"];
for (const t of tables) {
  const { error, count } = await sb.from(t).select("*", { count: "exact", head: true });
  out.tables[t] = error ? `❌ ${error.message}` : `✅ (${count ?? 0} rows)`;
}

/* 3. chat_rooms 预置 */
const { data: rooms } = await sb.from("chat_rooms").select("name, breed");
out.chatRoomCount = rooms?.length ?? 0;

console.log(JSON.stringify(out, null, 2));
