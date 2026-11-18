import postgres from "postgres";
import { readFileSync } from "node:fs";
const url = readFileSync(process.env.TEMP + "/env.backup.before-neon","utf8").match(/^DATABASE_URL=(.*)$/m)[1].replace(/^"|"$/g,"");
const s = postgres(url, { max: 1, connect_timeout: 5 });
try {
  const t = await s`select table_name from information_schema.tables where table_schema='public' order by 1`;
  for (const {table_name} of t) { const [{c}] = await s.unsafe(`select count(*)::int c from "${table_name}"`); console.log(table_name, c); }
} catch (e) { console.log("ERR", e.message); }
await s.end();
