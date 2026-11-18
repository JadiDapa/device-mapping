# Device Mapper

Aplikasi web untuk menitikkan, melabeli, dan memantau progres instalasi perangkat
jaringan di atas peta satelit, per zona. Spesifikasi lengkap: [`docs/PRD.md`](docs/PRD.md).
Aturan kerja untuk agent: [`CLAUDE.md`](CLAUDE.md).

Status: **M1 selesai** (fondasi: dependensi, PostgreSQL + Drizzle, Better Auth + role, seed).
Halaman dashboard/peta mulai di M2.

## Stack

Next.js 16 (App Router, `proxy.ts`, `output: "standalone"`) · React 19 · TypeScript strict ·
Tailwind v4 + shadcn/ui · PostgreSQL + postgres.js + Drizzle · Better Auth (email + password,
role `admin | guest` lewat plugin admin) · Zod + React Hook Form · zustand · next-themes ·
Leaflet + react-leaflet + Geoman · Turf · dnd-kit · Playwright · Vitest · Prettier.

Package manager: **npm** (PRD menyebut default `pnpm`; proyek ini sengaja tetap memakai npm
karena starter-nya sudah memakai `package-lock.json`).

## Quick start

Prasyarat: Node >= 22, PostgreSQL (lokal, atau lewat Docker Compose di bawah).

```bash
cp .env.example .env         # isi DATABASE_URL, BETTER_AUTH_SECRET (>= 32 karakter), SEED_ADMIN_*
npm install
# Opsional: Postgres dari Docker (host port 5433, bukan 5432)
docker compose up -d db
npm run db:migrate           # terapkan migrasi
npm run db:seed              # admin dari SEED_ADMIN_* + tipe perangkat default
npm run seed:dev             # data contoh: zona Pusri 1B & 2B (opsional, idempoten)
npm run dev                  # http://localhost:3000 -> /login
```

Bila memakai Postgres dari Compose, `DATABASE_URL` yang cocok adalah
`postgresql://postgres:postgres@localhost:5433/device-mapper`.

## Perintah

| Perintah                                 | Fungsi                                              |
| ---------------------------------------- | --------------------------------------------------- |
| `npm run dev` / `build` / `start`        | Dev / build standalone / jalankan hasil build       |
| `npm run typecheck`                      | `tsc --noEmit`                                      |
| `npm test`                               | Vitest (butuh `TEST_DATABASE_URL`, lihat di bawah)  |
| `npm run test:e2e`                       | Playwright (test e2e diisi mulai M2)                |
| `npm run db:generate`                    | Buat migrasi baru dari `src/db/schema.ts`           |
| `npm run db:migrate`                     | Terapkan migrasi (runtime migrator)                 |
| `npm run db:seed` / `seed:dev`           | Seed admin + tipe perangkat / data contoh           |
| `npm run format` / `format:check`        | Prettier                                            |
| `docker compose up -d db`                | Postgres untuk development                          |
| `docker compose --profile app up --build` | Aplikasi penuh di Docker (migrate + seed saat boot) |

## Environment

| Variabel                                                                     | Keterangan                                                                                     |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                               | Koneksi PostgreSQL (wajib).                                                                    |
| `TEST_DATABASE_URL`                                                          | Database **khusus test**, hanya dipakai `npm test`. Lihat di bawah.                            |
| `BETTER_AUTH_SECRET`                                                         | Rahasia sesi, minimal 32 karakter (wajib).                                                     |
| `BETTER_AUTH_URL`                                                            | Opsional. Bila diisi, base URL dipatok; bila kosong, host localhost/LAN dipercaya per request. |
| `TRUSTED_ORIGINS`                                                            | Origin tambahan untuk API auth, dipisah koma.                                                  |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`                                    | Dipakai `db:seed` saja (password minimal 8 karakter).                                          |
| `TZ`                                                                         | Default `Asia/Jakarta`.                                                                        |
| `NEXT_PUBLIC_TILE_URL`, `_TILE_ATTRIBUTION`, `_TILE_MAX_ZOOM`                | Tile satelit (default Esri World Imagery, tanpa API key). Attribution wajib tampil.            |
| `NEXT_PUBLIC_DEFAULT_CENTER_LAT`, `_LNG`, `NEXT_PUBLIC_DEFAULT_ZOOM`         | Tampilan awal peta. Nilai bawaan hanyalah perkiraan; ganti dengan koordinat area pabrik.       |

## Test dengan PostgreSQL lokal

Test database memakai Postgres sungguhan lewat `TEST_DATABASE_URL`, mis.
`postgresql://user:pass@localhost:5432/device-mapper-test`.

- Setiap file test **menghapus dan membuat ulang** schema `public` (dan `drizzle`) lalu
  menerapkan migrasi, jadi database ini harus kosong dan khusus test.
- Pengaman di `src/test/db.ts`: test menolak jalan bila `TEST_DATABASE_URL` kosong, menunjuk
  database yang sama dengan `DATABASE_URL`, atau nama databasenya tidak mengandung `test`.
- Test berjalan serial (`fileParallelism: false`) karena berbagi satu database.
- `vitest.config.ts` membaca `.env` otomatis.

## Kompatibilitas versi (PRD §2: "catat alasannya")

Semua paket dipasang di versi stabil terbaru (`@latest`, di-pin exact seperti starter).
Pemeriksaan peer dependency untuk peta (per 2026-11-18):

| Paket                              | Versi   | Peer `leaflet` |
| ---------------------------------- | ------- | -------------- |
| `leaflet`                          | 1.9.4   | —              |
| `react-leaflet`                    | 5.0.0   | `^1.9.0`       |
| `@geoman-io/leaflet-geoman-free`   | 2.20.6  | `^1.2.0`       |
| `@types/leaflet`                   | 1.9.22  | —              |

Leaflet **2.x** baru tersedia sebagai alpha/beta (dist-tag `latest` masih 1.9.4), dan
`react-leaflet` 5 serta Geoman 2.x hanya mendeklarasikan dukungan untuk Leaflet 1.x. Karena
`@latest` stabil = 1.9.4, tidak ada pin manual yang diperlukan; **jangan upgrade ke Leaflet 2**
sebelum kedua plugin itu mendukungnya. `react-leaflet` 5 membutuhkan React 19 (sudah dipakai).

## Struktur

- `src/app/` — route: `/login`, grup `(app)` (dilindungi sesi), `/api/auth`, `/api/health`
- `src/db/` — `schema.ts`, `auth-schema.ts`, `index.ts` (koneksi lazy), `seed.ts`, `migrations/`
- `src/lib/` — `auth.ts`, `authz.ts`, `auth-client.ts`, `env.ts`, `public-env.ts`, `status.ts`, `i18n/id.ts`
- `src/components/ui/` — komponen shadcn
- `src/proxy.ts` — cek cookie optimistik; gerbang sebenarnya `requireUser()` di `src/app/(app)/layout.tsx`
- `scripts/` — `migrate.ts`, `seed-admin.ts`, `seed-dev.ts`, `copy-standalone-assets.mjs`

## Catatan database

- `devices (zone_id, seq)` unik dengan constraint **DEFERRABLE INITIALLY DEFERRED**
  (`devices_zone_seq_unique`), ditambahkan lewat migrasi SQL kustom karena drizzle-kit tidak
  bisa mengekspresikannya. Ini memungkinkan renumber (tukar `seq`) dalam satu transaksi.
- Migrasi di-commit di `src/db/migrations/` dan diterapkan oleh runtime migrator
  (`scripts/migrate.ts`), bukan `drizzle-kit migrate`.

## Deploy (Docker)

`docker compose --profile app up --build` menjalankan aplikasi + Postgres. Entrypoint menjalankan
migrasi, seed admin, lalu `node server.js`. Chromium untuk export PNG/PDF (Playwright) ditambahkan
di M6 (`playwright install chromium --with-deps`).
