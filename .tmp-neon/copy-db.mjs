import postgres from "postgres";
import { readFileSync } from "node:fs";
const src = postgres(readFileSync(process.env.TEMP + "/env.backup.before-neon","utf8").match(/^DATABASE_URL=(.*)$/m)[1].replace(/^"|"$/g,""), { max: 1 });
const dst = postgres(process.env.DATABASE_URL_UNPOOLED, { max: 1 });
const SKIP = new Set(["session", "verification", "__drizzle_migrations"]);
const tables = (await src`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`).map(r => r.table_name).filter(t => !SKIP.has(t));
const deps = await src`select tc.table_name t, ccu.table_name r from information_schema.table_constraints tc join information_schema.constraint_column_usage ccu using (constraint_name, table_schema) where tc.constraint_type='FOREIGN KEY' and tc.table_schema='public'`;
const order = []; const left = new Set(tables);
while (left.size) { const next = [...left].filter(t => deps.filter(d => d.t === t && d.r !== t && left.has(d.r)).length === 0); if (!next.length) throw new Error("cycle"); next.forEach(t => { order.push(t); left.delete(t); }); }
for (const t of order) { const [{ c }] = await dst.unsafe(`select count(*)::int c from "${t}"`); if (c) throw new Error(`Neon table ${t} not empty (${c}); aborting`); }
await dst.begin(async tx => {
  await tx`set constraints all deferred`;
  for (const t of order) {
    const rows = (await src.unsafe(`select to_jsonb(x) j from "${t}" x`)).map(r => r.j);
    if (rows.length) await tx.unsafe(`insert into "${t}" select * from jsonb_populate_recordset(null::"${t}", $1::text::jsonb)`, [JSON.stringify(rows)]);
    console.log(t, rows.length);
  }
});
for (const t of order) {
  const [{ a }] = await src.unsafe(`select count(*)::int a from "${t}"`); const [{ b }] = await dst.unsafe(`select count(*)::int b from "${t}"`);
  console.log(a === b ? "OK " : "MISMATCH", t, a, b);
}
await src.end(); await dst.end();
