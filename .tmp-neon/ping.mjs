import postgres from "postgres";
const s = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try { console.log(await s`select current_database() db, split_part(version(),' ',2) v`); }
catch (e) { console.log("ERR", e.message); }
await s.end();
