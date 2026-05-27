import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n").filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

const out = { commentsCols: {}, tables: {}, buckets: {} };

/* 1. comments 新列 */
for (const col of ["id", "parent_id", "like_count"]) {
  const { error } = await sb.from("comments").select(col).limit(1);
  out.commentsCols[col] = error ? `❌ ${error.message}` : "✅";
}

/* 2. comment_likes 表 */
const { error: clErr, count: clCount } = await sb
  .from("comment_likes").select("*", { count: "exact", head: true });
out.tables.comment_likes = clErr ? `❌ ${clErr.message}` : `✅ (${clCount ?? 0} rows)`;

/* 3. Storage bucket */
const { data: buckets, error: bErr } = await sb.storage.listBuckets();
out.buckets = bErr ? `❌ ${bErr.message}` :
  buckets.map((b) => `${b.id} (public=${b.public})`);

console.log(JSON.stringify(out, null, 2));
