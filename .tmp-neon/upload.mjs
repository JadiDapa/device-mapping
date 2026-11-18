import postgres from "postgres";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
const BUCKET = "assets", ROOT = path.resolve("data/uploads");
const walk = d => readdirSync(d).flatMap(n => { const f = path.join(d, n); return statSync(f).isDirectory() ? walk(f) : [f]; });
const files = walk(ROOT).map(f => path.relative(ROOT, f).split(path.sep).join("/"));
const sql = postgres(process.env.DATABASE_URL_UNPOOLED, { max: 1 });
const cols = (await sql`select column_name from information_schema.columns where table_name='camera_point_images' and column_name like '%key%'`).map(r => r.column_name);
const rows = await sql.unsafe(`select ${cols.map(c => `"${c}"`).join(",")} from camera_point_images`);
const dbKeys = new Set(rows.flatMap(r => Object.values(r)));
console.log("disk files:", files.length, "db keys:", dbKeys.size, "missing on disk:", [...dbKeys].filter(k => !files.includes(k)), "untracked on disk:", files.filter(k => !dbKeys.has(k)));
const s3 = new S3Client({ forcePathStyle: true });
const ct = { webp: "image/webp", jpg: "image/jpeg", png: "image/png" };
let ok = 0;
for (const key of files) {
  const body = readFileSync(path.join(ROOT, key));
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: ct[key.split(".").pop()] ?? "application/octet-stream", CacheControl: "private, max-age=31536000, immutable" }));
  const back = Buffer.from(await (await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))).Body.transformToByteArray());
  if (!back.equals(body)) throw new Error("MISMATCH " + key);
  ok++; console.log("OK", key, body.length);
}
const listed = (await s3.send(new ListObjectsV2Command({ Bucket: BUCKET }))).KeyCount;
console.log(`verified ${ok}/${files.length}; bucket object count: ${listed}`);
await sql.end();
