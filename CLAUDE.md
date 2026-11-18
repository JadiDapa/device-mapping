# Device Mapper

Pemetaan & progres instalasi perangkat di peta satelit, per zona.
**Spesifikasi lengkap: `docs/PRD.md` — baca sebelum mengerjakan fitur.**
Milestone berurutan (PRD §12); tiap milestone lolos `typecheck` + `format:check` sebelum lanjut.

## Stack

Next.js 16 App Router (`output: "standalone"`) · React 19 · TypeScript strict ·
PostgreSQL + `postgres` (postgres.js) + Drizzle · Better Auth (email+password, role `admin|guest`) ·
RHF + Zod · zustand (state UI peta) · Tailwind v4 + shadcn/ui (Radix + CVA) · next-themes ·
sonner · date-fns + @date-fns/tz · Leaflet + react-leaflet + Geoman · Turf · dnd-kit ·
Playwright (export PNG/PDF + e2e) · Vitest. Package manager: **npm**.

## Perintah

`npm run dev|build|start` · `npm run typecheck` · `npm test` · `npm run test:e2e` ·
`npm run db:generate|db:migrate|db:seed` · `npm run seed:dev` · `npm run format|format:check` ·
`docker compose up -d db` (Postgres dev)

## Struktur (PRD §9)

src/app · src/components/{ui,map,devices} · src/db/{schema.ts,migrations/,seed.ts,index.ts} ·
src/lib/{status.ts,auth.ts,env.ts,validators/,i18n/id.ts} · src/server/{actions,export} · scripts/

## Aturan wajib

- Next.js 16: `proxy.ts`, bukan `middleware.ts`. Node >= 22, ESM.
- Semua teks UI di `src/lib/i18n/id.ts` (Bahasa Indonesia) — jangan inline string.
- Timezone `Asia/Jakarta`; format tanggal `dd MMM yyyy HH:mm` WIB via date-fns + @date-fns/tz.
- Status: enum/label/warna HANYA di `src/lib/status.ts`. Tidak ada warna hardcode di komponen
  selain lewat file itu; warna lain lewat CSS variables/token.
- Otorisasi di server pada SETIAP Server Action / Route Handler (`requireUser()` / `requireAdmin()`);
  guest yang memanggil mutasi → 403. `proxy.ts` hanya optimistic.
- Mutasi = Server Actions; export = Route Handlers. Skema Zod di `src/lib/validators/` dipakai
  client (zodResolver) dan divalidasi ulang di server.
- `seq` perangkat 1..n tanpa celah per zona; renumber selalu dalam satu transaksi.
  `unique(zone_id, seq)` DEFERRABLE INITIALLY DEFERRED (custom SQL migration).
- Ringkasan (count per status, router) dihitung di DB (`GROUP BY`), tidak pernah disimpan.
- Setiap perubahan status (termasuk saat create) → 1 baris `device_status_history`.
- Leaflet hanya di client: `"use client"` + `dynamic(..., { ssr: false })`.
- URL/attribution tile dari env `NEXT_PUBLIC_TILE_*`; attribution wajib tampil.
- localStorage selalu dibungkus try/catch.
- Status tidak boleh dibedakan hanya dengan warna — badge selalu menampilkan label.
- DB, auth, env dibuat lazy (`getDb()`, `getAuth()`, `getEnv()`) agar `next build` tidak butuh env/DB.
- Migrasi di-commit (`src/db/migrations/`) dan diterapkan oleh runtime migrator
  (`scripts/migrate.ts`), bukan `drizzle-kit migrate`.
- Versi paket: `@latest` stabil; bila tidak kompatibel, pilih kombinasi terbaru yang kompatibel
  dan catat alasannya di README.
- Repo referensi (PRD §2.1) belum diisi; bila diisi, baca dulu dan ikuti strukturnya.

## Testing

TDD untuk logika (Vitest): renumber, validasi partial, ringkasan. Test DB memakai Postgres
lokal via `TEST_DATABASE_URL` (database terpisah, di-reset per file test). Config/wiring murni
tidak perlu test. E2E: Playwright (PRD §11).

## Git

Conventional Commits per unit kerja selesai. Jangan push/amend tanpa izin.
