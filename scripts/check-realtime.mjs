import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").filter(l => l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

// 用 PostgREST rpc-style 通过查询 pg_publication_tables 视图
const r = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({}),
}).catch(() => null);

// fallback：直接 select pg_publication_tables 是不允许的；用 supabase-js 列下 storage objects 大概看下规模
const sb = createClient(url, key, { auth: { persistSession: false } });

// 列 posts 表的列以确认 cover/display/thumbnail 字段
const cols = await Promise.all([
  "cover_thumbnail_url","cover_image_url","cover_aspect_ratio",
  "display_image_urls","thumbnail_urls","image_urls",
  "post_type","text_bg_color","title"
].map(async (c) => {
  const { error } = await sb.from("posts").select(c).limit(1);
  return [c, error ? `❌ ${error.message}` : "✅"];
}));

console.log("posts 字段：");
console.log(JSON.stringify(Object.fromEntries(cols), null, 2));

// storage objects 总数
const { data: list, error: lErr } = await sb.storage.from("post-images").list("", { limit: 5 });
console.log("\nstorage post-images 第一层目录预览：");
console.log(lErr ? `❌ ${lErr.message}` : list.map(o => o.name));
