import postgres from "postgres";
import { readFileSync } from "node:fs";
import { deleteFiles, readFileBytes } from "../src/server/storage";
const BASE = "http://127.0.0.1:3000", H = { Origin: "http://localhost:3000" };
const sql = postgres(process.env.DATABASE_URL_UNPOOLED!, { max: 1 });
const check = (name: string, cond: boolean, extra = "") => { console.log(cond ? "PASS" : "FAIL", name, extra); if (!cond) process.exitCode = 1; };

check("health", (await fetch(BASE + "/api/health")).status === 200);
const [img] = await sql`select camera_point_id, display_key, thumb_key, size_bytes from camera_point_images limit 1`;
check("unauthenticated image -> 401", (await fetch(`${BASE}/api/uploads/${img.display_key}`)).status === 401);

const login = await fetch(BASE + "/api/auth/sign-in/email", { method: "POST", headers: { ...H, "Content-Type": "application/json" },
  body: JSON.stringify({ email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD }) });
check("admin sign-in (user from Neon DB)", login.status === 200, `status ${login.status}`);
const cookie = login.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
const A = { ...H, Cookie: cookie };

const r1 = await fetch(`${BASE}/api/uploads/${img.display_key}`, { headers: A });
const b1 = Buffer.from(await r1.arrayBuffer());
check("migrated image served from bucket", r1.status === 200 && b1.length === Number(img.size_bytes) && r1.headers.get("content-type") === "image/webp", `${r1.status} ${b1.length}B`);

const thumb = readFileSync("data/uploads/" + img.thumb_key);
const form = new FormData();
form.set("display", new File([thumb], "d.webp", { type: "image/webp" }));
form.set("thumb", new File([thumb], "t.webp", { type: "image/webp" }));
form.set("caption", "neon e2e test");
const up = await fetch(`${BASE}/api/camera-points/${img.camera_point_id}/images`, { method: "POST", headers: A, body: form });
const upJson: any = await up.json();
check("upload new image", up.status === 200 && upJson.ok, `status ${up.status}`);
const created = upJson.data?.image ?? upJson.image;
const [row] = await sql`select display_key, thumb_key from camera_point_images where caption = 'neon e2e test'`;
check("row inserted in Neon DB", !!row);
check("new object exists in bucket", !!(await readFileBytes(row.display_key)) && !!(await readFileBytes(row.thumb_key)));
const r2 = await fetch(`${BASE}/api/uploads/${row.display_key}`, { headers: A });
check("new image served back identical", r2.status === 200 && Buffer.from(await r2.arrayBuffer()).equals(thumb));

const [zone] = await sql`select z.id from zones z join camera_points c on c.zone_id = z.id limit 1`;
const zip = await fetch(`${BASE}/api/export/camera-zip?zone=${zone.id}`, { headers: A });
const zb = Buffer.from(await zip.arrayBuffer());
check("camera ZIP export reads from bucket", zip.status === 200 && zb.subarray(0, 2).toString() === "PK" && zb.length > 100000, `${zip.status} ${zb.length}B`);
readFileSync; (await import("node:fs")).writeFileSync(".tmp-neon/out.zip", zb);

// cleanup: delete via the storage module + row
await deleteFiles([row.display_key, row.thumb_key]);
check("deleteFiles removed objects", (await readFileBytes(row.display_key)) === null && (await readFileBytes(row.thumb_key)) === null);
await sql`delete from camera_point_images where caption = 'neon e2e test'`;
const [{ n }] = await sql`select count(*)::int n from camera_point_images`;
check("DB back to 4 images", n === 4, String(n));
await sql.end();
