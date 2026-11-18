# PRD — Device Mapper (Pemetaan & Progres Instalasi Perangkat)
 
> Dokumen ini ditujukan untuk agent Claude Code sebagai spesifikasi implementasi.
> Bahasa UI: **Bahasa Indonesia**. Timezone: **Asia/Jakarta**.
 
---
 
## 1. Ringkasan
 
Aplikasi web untuk **menitikkan, melabeli, dan memantau progres instalasi** perangkat jaringan (gateway, BLE receiver, dll.) di atas **peta satelit interaktif**, dikelompokkan per **zona** (contoh: Pusri 1B, Pusri 2B).
 
Masalah yang diselesaikan: saat ini pemetaan dilakukan manual di atas screenshot (rawan salah hitung, mis. ringkasan "Total Switch POE: 2" padahal di peta ada 4). Aplikasi ini menjadikan peta, status, dan ringkasan **satu sumber data** yang dihitung otomatis.
 
**Target pengguna**
- **Admin** — membuat zona, menaruh titik, mengubah status di lapangan, mengatur urutan, export.
- **Guest** — hanya melihat peta, detail, ringkasan, dan export.
**Platform**: desktop-first, tetap nyaman di HP (responsif).
 
---
 
## 2. Tech Stack (wajib)
 
> **Versi**: install semua paket dengan versi **stabil terbaru** saat proyek dibuat (`<pm> add <pkg>@latest`). Jangan menyalin pin versi lama. Bila dua paket saling tidak kompatibel di versi terbaru (mis. Leaflet ↔ react-leaflet ↔ Geoman), pilih versi terbaru yang **kompatibel satu sama lain** dan catat alasannya di README.
 
### 2.0 Titik awal proyek
 
Proyek **dimulai dari Next.js starter template** (`create-next-app`) yang sudah ada di folder kerja. Proyek ini **tidak** di-clone atau di-fork dari repo referensi.
 
Aturan untuk agent:
- **Jangan** menjalankan `create-next-app` ulang dan jangan membuat proyek baru di subfolder.
- Periksa dulu kondisi starter: `package.json`, `tsconfig.json`, `next.config.*`, ada/tidaknya `src/`, alias import, setup Tailwind, dan ESLint.
- Bangun di atas starter tersebut:
  - Tambahkan dependencies di §2.2.
  - Gabungkan scripts §9 ke `package.json` yang ada.
  - Set `output: "standalone"` di `next.config`.
  - Tambahkan Prettier.
- Bila starter sudah membawa sesuatu yang setara (mis. ESLint, struktur `src/`), **pertahankan**, jangan dihapus.
- Hapus konten demo starter (halaman contoh, aset default) setelah halaman aplikasi tersedia.
### 2.1 Referensi repo & design system (placeholder)
 
| Item | Nilai |
|---|---|
| Repo referensi (**hanya** acuan struktur folder & coding convention, bukan basis proyek) | `<<REFERENCE_REPO_URL>>` — **akan diisi** |
| Tema & design system | `<<DESIGN_SYSTEM>>` — **akan menyusul** |
 
Aturan untuk agent:
1. Bila repo referensi sudah diisi: **baca dulu** repo tersebut sebelum menulis kode. Jangan menyalin kode fitur atau dependency yang tidak relevan dari repo itu (mis. fitur scoreboard). Yang diikuti hanya struktur folder, penamaan file, pola Server Action, pola auth helper, konfigurasi Prettier/TS, dan konvensi testing-nya. Jika bertentangan dengan §9, **repo referensi yang menang**.
2. Bila belum diisi: pakai struktur default di §9.
3. Tema/design system belum ada: pakai komponen gaya shadcn/ui (Radix + CVA + Tailwind CSS variables) dengan token netral, light/dark via `next-themes`. Semua warna lewat CSS variables/token agar mudah diganti nanti. **Jangan** hardcode warna di komponen, kecuali warna status yang terpusat di `src/lib/status.ts`.
### 2.2 Dependencies
 
**Inti (dari stack referensi)**
| Bagian | Paket |
|---|---|
| Framework | `next` (App Router, `output: "standalone"`), `react`, `react-dom` |
| Bahasa | `typescript` (strict) |
| Database | PostgreSQL + driver `postgres` (postgres.js) |
| ORM / migrasi | `drizzle-orm`, `drizzle-kit` |
| Auth | `better-auth`, `@better-auth/drizzle-adapter` (email + password, field `role`) |
| Form & validasi | `react-hook-form`, `@hookform/resolvers`, `zod` (skema dipakai bersama client & server) |
| State client | `zustand` (state UI peta: mode, filter, toggle layer, perangkat terpilih) |
| UI primitives | `radix-ui`, `class-variance-authority`, util `cn` (ikuti repo referensi; default `clsx` + `tailwind-merge`) |
| Ikon | `lucide-react` |
| Toast | `sonner` |
| Tema | `next-themes` |
| Tanggal | `date-fns`, `@date-fns/tz` (format WIB, `Asia/Jakarta`) |
| Styling | `tailwindcss` v4, `@tailwindcss/postcss`, `tw-animate-css` |
 
**Tambahan khusus aplikasi ini**
| Bagian | Paket |
|---|---|
| Peta | `leaflet`, `react-leaflet`, `@types/leaflet` (komponen peta di-load via `dynamic(..., { ssr: false })`) |
| Gambar polygon | `@geoman-io/leaflet-geoman-free` |
| Geo util | `@turf/boolean-point-in-polygon`, `@turf/bbox`, `@turf/center` |
| Drag & drop urutan | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| Export PNG/PDF (runtime) | `playwright` (bukan hanya `@playwright/test`) + Chromium terinstall di server |
 
**Dev**
`@playwright/test`, `vitest`, `tsx`, `prettier`, `prettier-plugin-tailwindcss`, `@types/node`, `@types/react`, `@types/react-dom`.
 
**Tidak dipakai** dari stack referensi: `better-sqlite3` (diganti PostgreSQL), `qrcode`, `dseg`, `react-day-picker`.
 
**Lain-lain**
- Node `>=22`, `"type": "module"`.
- Package manager: ikuti repo referensi (default `pnpm`).
- Dev DB: `docker-compose.yml` berisi PostgreSQL.
**Tile satelit**: Esri World Imagery (tanpa API key).
```
NEXT_PUBLIC_TILE_URL=https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
NEXT_PUBLIC_TILE_ATTRIBUTION="Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
NEXT_PUBLIC_TILE_MAX_ZOOM=19
```
URL tile **harus** dari env agar bisa diganti (mis. ke Google/Mapbox) tanpa ubah kode. Attribution wajib tampil di peta.
 
Env lain:
```
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
NEXT_PUBLIC_DEFAULT_CENTER_LAT=   # isi koordinat area pabrik
NEXT_PUBLIC_DEFAULT_CENTER_LNG=
NEXT_PUBLIC_DEFAULT_ZOOM=16
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```
 
---
 
## 3. Konsep & Istilah
 
| Istilah | Arti |
|---|---|
| **Zona** | Area kerja (mis. Pusri 2B). Punya nama, deskripsi, batas polygon. |
| **Perangkat / Titik** | Satu device yang dipasang. Bernomor urut per zona. |
| **Tipe Perangkat** | Master data yang dikelola admin (Gateway, BLE Receiver, …) + ikon. |
| **Router** | Flag pada perangkat (`is_router`). Satu titik box router **selalu sekaligus BLE Receiver** (bukan Gateway). Ditampilkan sebagai ikon kecil di samping lingkaran nomor. Menggantikan "lingkaran hijau" pada desain lama. |
| **Rantai koneksi** | Sumber jaringan (router shelter) → **Router + BLE** (`network_source_id`) → perangkat lain, mis. BLE Gateway/CCTV (`parent_device_id`, harus router di zona yang sama). Router tidak punya induk perangkat. |
| **Sumber Jaringan** | Titik asal jaringan (Shelter, Control Room, Panel, dll.). Nama & jenis bebas. |
| **Status** | Tahap instalasi (4 tahap, lihat §4). |
 
---
 
## 4. Status Instalasi
 
| # | Kode (`status` enum) | Label UI | Warna marker |
|---|---|---|---|
| 1 | `not_installed` | Belum terinstall | Abu-abu `#9CA3AF` |
| 2 | `partial` | Terinstall sebagian | Oranye `#F59E0B` |
| 3 | `installed_untested` | Terinstall, belum diuji | Biru `#3B82F6` |
| 4 | `tested` | Sudah diuji | Hijau `#16A34A` |
 
- Warna didefinisikan di **satu file konstanta** (`src/lib/status.ts`) dan dipakai oleh marker, legend, badge, chart, dan export.
- Status `partial` memiliki **checklist** komponen yang *sudah* terpasang: `Power`, `FO`, `Ethernet` (boleh lebih dari satu) + **catatan bebas**.
  - Validasi: bila status `partial`, minimal satu checkbox tercentang **atau** catatan terisi.
  - Bila status bukan `partial`, nilai checklist tetap disimpan (tidak dihapus) tetapi tidak ditampilkan.
- Setiap perubahan status (termasuk saat pembuatan) dicatat ke **riwayat status**.
---
 
## 5. Model Data (Drizzle / PostgreSQL)
 
Semua tabel: `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at` (timestamptz).
 
### `user` (dari Better Auth) — tambahan:
- `role` enum `admin | guest`, default `guest`.
### `zones`
| Kolom | Tipe | Catatan |
|---|---|---|
| name | text unique not null | "Pusri 2B" |
| description | text | deskripsi zona |
| boundary | jsonb | GeoJSON `Polygon`; nullable (zona boleh dibuat dulu, digambar kemudian) |
| center_lat, center_lng | double precision | nullable; default dihitung dari boundary |
| default_zoom | int | nullable |
| created_by | fk user | |
 
### `device_types`
| Kolom | Tipe | Catatan |
|---|---|---|
| name | text unique not null | "Gateway", "BLE Receiver" |
| icon | text not null | nama ikon dari daftar preset lucide (mis. `radio`, `bluetooth`, `wifi`, `cpu`, `antenna`) |
| description | text | |
 
- Tidak bisa dihapus bila masih dipakai perangkat (tampilkan pesan + jumlah pemakaian).
### `network_sources`
| Kolom | Tipe | Catatan |
|---|---|---|
| zone_id | fk zones, **nullable** | sumber bisa berada di antara zona |
| name | text not null | "Shelter Utilitas P2B" |
| kind | text not null | bebas, dengan saran autocomplete dari nilai yang sudah ada (Shelter, Control Room, Panel) |
| lat, lng | double precision not null | |
| description | text | |
 
### `devices`
| Kolom | Tipe | Catatan |
|---|---|---|
| zone_id | fk zones not null | on delete cascade |
| seq | int not null | nomor urut di zona, mulai 1, **tanpa celah** |
| device_type_id | fk device_types not null | |
| is_router | boolean default false | |
| lat, lng | double precision not null | |
| location_detail | text | "Lantai 1", "LT 2 Lorong Kanan", "Tangga Lantai 3" |
| notes | text | |
| status | enum (§4) default `not_installed` | |
| has_power | boolean default false | checklist partial |
| has_fo | boolean default false | |
| has_ethernet | boolean default false | |
| partial_note | text | |
| network_source_id | fk network_sources, nullable | on delete set null; dipakai oleh router |
| parent_device_id | fk devices, nullable | on delete set null; router induk (non-router saja), zona sama |
| updated_by | fk user | |
 
Constraint: `unique (zone_id, seq)` **DEFERRABLE INITIALLY DEFERRED** (agar renumber dalam satu transaksi aman). Jika drizzle-kit tidak mendukung deferrable, tulis lewat custom SQL migration.
 
### `camera_points` (F9)
| Kolom | Tipe |
|---|---|
| zone_id | fk zones, on delete cascade |
| name | text, wajib (maks. 100) |
| notes | text nullable |
| lat, lng | double precision |
| updated_by | fk user |

### `camera_point_images` (F9)
| Kolom | Tipe |
|---|---|
| camera_point_id | fk camera_points, on delete cascade |
| position | int, 0..n-1 tanpa celah per titik |
| caption | text nullable (maks. 300) |
| display_key, thumb_key | text — kunci file di storage lokal |
| width, height, size_bytes, mime | metadata versi tampilan |
| uploaded_by | fk user |

Constraint: `unique (camera_point_id, position)` **DEFERRABLE INITIALLY DEFERRED** (custom SQL di migrasi `0006`). Jumlah gambar per titik dihitung di DB, tidak disimpan.

### `device_status_history`
| Kolom | Tipe |
|---|---|
| device_id | fk devices, on delete cascade |
| from_status | enum nullable (null = dibuat) |
| to_status | enum |
| snapshot | jsonb (`has_power`, `has_fo`, `has_ethernet`, `partial_note`) |
| note | text |
| changed_by | fk user |
| changed_at | timestamptz default now() |
 
---
 
## 6. Aturan Penomoran
 
- Perangkat baru → `seq = max(seq) + 1` di zona tersebut.
- **Reorder** lewat sidebar (drag & drop) → server menerima array id terurut, lalu menulis ulang `seq` 1..n dalam satu transaksi.
- **Hapus** perangkat → `seq` sisanya dirapatkan ulang (tanpa celah).
- **Pindah zona** → perangkat ditaruh di urutan terakhir zona tujuan; zona asal dirapatkan.
- Nomor pada marker, sidebar, tabel, dan export selalu = `seq`.
---
 
## 7. Fitur & Acceptance Criteria
 
### F1. Autentikasi & Role
- Login email + password. Tidak ada registrasi publik.
- Admin mengelola user di `/admin/users`: tambah, ubah role, reset password, nonaktifkan.
- Seed: satu admin dari env `SEED_ADMIN_*`.
- **Otorisasi dicek di server** pada setiap Server Action / Route Handler (bukan hanya disembunyikan di UI).
- AC: guest yang memanggil action mutasi langsung → ditolak (403).
### F2. Dashboard Zona (`/`)
- Kartu per zona: nama, deskripsi singkat, total titik, jumlah router, **progress bar bertumpuk per status** + persentase "Sudah diuji".
- Tombol "Lihat semua di peta" → `/map` (semua polygon zona + marker; klik polygon → masuk zona).
- Admin: tombol "Zona baru".
- AC: angka di kartu selalu sama dengan data perangkat (tidak ada input manual).
### F3. Kelola Zona
- Form: nama, deskripsi.
- Gambar/edit polygon batas di peta (Geoman). Bisa dibuat tanpa polygon lalu digambar kemudian.
- Hapus zona: dialog konfirmasi yang mewajibkan mengetik nama zona; menghapus seluruh perangkatnya (cascade).
- AC: polygon tersimpan sebagai GeoJSON valid; peta zona otomatis `fitBounds` ke polygon.
### F4. Halaman Zona (`/zones/[id]`) — layar utama
Layout desktop: **peta (kiri/tengah)** + **sidebar kanan** (daftar perangkat) + **drawer detail**.
Layout mobile: peta penuh + **bottom sheet** untuk daftar & detail.
 
**Peta**
- Tile satelit dari env, polygon zona digambar dengan garis putih tipis.
- **Marker perangkat** = lingkaran bernomor (`L.divIcon`), warna isi sesuai status, angka putih, border putih.
- Jika `is_router` → **badge ikon router kecil** (lucide `router`) di kanan-atas lingkaran.
- **Marker sumber jaringan** = bentuk berbeda (persegi membulat biru) + label nama selalu tampil.
- Toggle tampilan (disimpan di localStorage dengan try/catch):
  - Label lokasi detail di bawah nomor (mis. "Lantai 1")
  - Ikon tipe perangkat sebagai badge kecil kiri-bawah
  - **Garis koneksi** perangkat → sumber jaringan (default: off)
- **Legend** (bisa diciutkan): 4 status + ikon router + sumber jaringan + garis koneksi.
- **Kotak ringkasan** (pojok kanan atas, seperti desain lama): nama zona, total titik, total router, jumlah per status.
- Tombol "Posisi saya" (geolocation browser) untuk dipakai di lapangan.
**Mode admin**
- Tombol "Tambah perangkat" → klik di peta → form detail muncul dengan `seq` berikutnya.
- Opsi "Tambah di posisi saya" (pakai GPS HP).
- Tombol "Tambah sumber jaringan" → klik di peta → form nama/jenis.
- **Geser marker**: desktop drag langsung; mobile harus masuk "mode pindah" dulu (cegah geser tidak sengaja).
- Bila titik ditaruh/digeser **di luar polygon zona** → tampilkan **peringatan** (tidak diblokir).
**Sidebar daftar perangkat**
- Item: nomor, ikon tipe, nama tipe, badge router, lokasi detail, badge status.
- Admin: **drag & drop untuk ubah urutan** → nomor diperbarui otomatis.
- Filter: status (multi), tipe (multi), hanya router; pencarian teks (lokasi/catatan).
- Klik item → peta `flyTo` marker + buka detail.
- Filter juga menyaring marker di peta.
**Detail perangkat (drawer/sheet)**
- Field: nomor, tipe, router, lokasi detail, catatan, sumber jaringan (dropdown, opsional), koordinat.
- **Ubah status cepat**: 4 tombol segmented. Pilih "Terinstall sebagian" → tampil checklist Power/FO/Ethernet + catatan.
- Tab **Riwayat**: daftar perubahan status (dari → ke, oleh siapa, kapan, catatan).
- Admin: edit, pindah zona, hapus (konfirmasi).
- Guest: semua read-only.
- AC: mengubah status langsung mengubah warna marker tanpa reload (optimistic update) dan menambah 1 baris riwayat.
### F5. Tipe Perangkat (`/admin/device-types`)
- CRUD nama, ikon (pilih dari grid preset lucide), deskripsi.
- Seed awal: "Gateway" (`radio`), "BLE Receiver" (`bluetooth`), "CCTV" (`cctv`).
- AC: ikon baru langsung terpakai di marker/sidebar/legend.
### F6. Sumber Jaringan
- CRUD dari peta zona dan dari daftar `/network-sources`.
- Menghubungkan perangkat → sumber bersifat **opsional**.
- Detail sumber menampilkan daftar perangkat yang terhubung.
### F7. Export
**PNG per zona**
- Tombol di halaman zona. Hasil: peta zona (fit ke polygon) dengan marker, label, legend, dan kotak ringkasan. Nama file: `<zona>_<YYYY-MM-DD>.png`.
**PDF rekap multi-zona** (`/export`)
- Pilih zona dengan checkbox (+ "pilih semua").
- Isi PDF (A4 landscape):
  1. Halaman sampul: judul, tanggal cetak, daftar zona, ringkasan total gabungan per status.
  2. Per zona: snapshot peta + kotak ringkasan + legend.
  3. Per zona: tabel perangkat — No, Tipe, Router, Lokasi Detail, Status, Detail Partial (Power/FO/Ethernet + catatan), Sumber Jaringan, Catatan, Terakhir diubah.
- Nama file: `Rekap_Instalasi_<YYYY-MM-DD>.pdf`.
**Implementasi**
- Route print internal:
  - `/print/zones/[id]`: satu zona, ukuran tetap (untuk PNG).
  - `/print/report?zones=<id,id,...>`: seluruh rekap dalam satu halaman HTML dengan CSS `break-after: page` per bagian (untuk PDF).
- Route Handler `/api/export/png` & `/api/export/pdf` menjalankan Playwright:
  1. Membuka halaman print dengan token export bertanda tangan berumur pendek.
  2. Menunggu flag `window.__MAP_READY__ = true`, yang diset setelah semua tile layer selesai `load` dan semua marker dirender.
  3. Mengambil `page.screenshot()` untuk PNG atau `page.pdf({ format: "A4", landscape: true })` untuk PDF.
- Deploy: build standalone harus menyertakan Chromium (`playwright install chromium --with-deps` di image/server). Dokumentasikan di README.
- Guest boleh export.
### F9. Titik Kamera (Camera Capture Position)
Membantu pemetaan 3D: menandai dari titik mana foto area diambil, dengan banyak foto per titik (upload manual).
- Admin: tambah titik (klik peta, sama seperti extender), edit nama/catatan, geser, hapus (menghapus foto dan file-nya).
- Admin: upload banyak foto (pilih file / drag-and-drop), keterangan per foto, ubah urutan (drag-and-drop + tombol), hapus foto. Maks. 50 foto per titik.
- Foto dikompres di browser (sisi terpanjang 2560 px, WebP; thumbnail 400 px, EXIF dibuang); server memvalidasi ulang tipe (magic bytes) dan ukuran.
- Semua user (admin & guest): marker kamera + badge jumlah foto; klik marker → popover berisi nama + thumbnail + "Lihat semua"; klik thumbnail → galeri fullscreen (tombol, panah keyboard, swipe, strip thumbnail semua foto titik itu).
- Toggle "Titik kamera" di toolbar (tersimpan).
- Admin: "Unduh foto (ZIP)" di header zona → semua foto zona dalam satu ZIP: `<zona>/<NN>_<titik>/<NN>_<titik>_<III>_<lat>_<lng>.<ext>` (NN = urutan titik, III = urutan foto, koordinat 5 desimal) + `<zona>/manifest.csv` (file, titik, lat, lng, nomor foto, keterangan, ukuran). `GET /api/export/camera-zip?zone=<id>`, admin saja (guest 403, anonim 401), di-stream satu foto per waktu.
- Guest memanggil mutasi → 403. File hanya bisa diakses user yang login (`/api/uploads/...`).
- Penyimpanan: disk lokal `UPLOADS_DIR` (volume Docker). Upload lewat Route Handler (bukan Server Action) agar tidak terkena batas 1 MB dan bisa menampilkan progres.
- Tidak termasuk: export PNG/PDF, peta semua zona, resolusi asli, S3.

### F8. Responsif
- Breakpoint `md`: di bawahnya sidebar → bottom sheet, toolbar diringkas, tombol berukuran sentuh (≥ 44px).
- Semua fitur admin bisa dilakukan di HP.
---
 
## 8. Struktur Halaman
 
```
/login
/                       Dashboard zona
/map                    Semua zona dalam satu peta
/zones/new              (admin)
/zones/[id]             Halaman zona (peta + sidebar + detail)
/zones/[id]/edit        (admin) nama, deskripsi, polygon
/network-sources        Daftar sumber jaringan
/export                 Pilih zona → PDF
/admin/users            (admin)
/admin/device-types     (admin)
/print/zones/[id]       Internal, untuk Playwright
```
 
---
 
## 9. Arsitektur & Konvensi
 
> Struktur di bawah adalah **default**. Bila `<<REFERENCE_REPO_URL>>` sudah diisi, ikuti repo referensi (§2.1).
 
- Mutasi lewat **Server Actions**; export lewat **Route Handlers**.
- Form: `react-hook-form` + `zodResolver`, skema Zod yang sama divalidasi ulang di server.
- State UI peta (mode tambah/pindah, filter, toggle layer, selected id) di **zustand** store; data server lewat Server Components + `revalidatePath`/optimistic update.
- Notifikasi: `sonner`. Tanggal: `date-fns` + `@date-fns/tz` (`Asia/Jakarta`).
- Struktur default:
```
scripts/
  migrate.ts              jalankan migrasi Drizzle
  seed-admin.ts           buat admin dari env
  seed-dev.ts             data contoh: zona Pusri 1B & 2B, tipe perangkat, beberapa titik
  copy-standalone-assets.mjs
src/
  app/...                 routes
  components/map/         MapView, DeviceMarker, SourceMarker, Legend, SummaryBox, DrawControl
  components/devices/     DeviceSidebar, DeviceDetail, StatusSelector
  db/schema.ts            skema Drizzle
  db/migrations/
  db/seed.ts
  lib/status.ts           enum, label, warna (single source of truth)
  lib/auth.ts             Better Auth + helper requireAdmin()/requireUser()
  lib/validators/         skema Zod
  server/actions/         zones.ts, devices.ts, sources.ts, deviceTypes.ts, users.ts
  server/export/          playwright renderer
```
- Semua query ringkasan (count per status, router) dihitung di DB (`GROUP BY`), bukan disimpan.
- Komponen Leaflet hanya di client (`"use client"` + dynamic import tanpa SSR).
- Scripts (`package.json`), mengikuti pola stack referensi:
```json
{
  "dev": "next dev",
  "build": "next build && node scripts/copy-standalone-assets.mjs",
  "start": "node .next/standalone/server.js",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "tsx --env-file=.env scripts/migrate.ts",
  "db:seed": "tsx --env-file=.env scripts/seed-admin.ts",
  "seed:dev": "tsx --env-file=.env scripts/seed-dev.ts",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```
 
---
 
## 10. Non-Fungsional
 
- Performa: zona dengan 500 marker tetap lancar (gunakan `divIcon` ringan; memoize marker).
- Keamanan: password di-hash (bawaan Better Auth); semua action cek role; input divalidasi Zod di server.
- Data integritas: renumber selalu dalam transaksi.
- Konkurensi: last-write-wins; tampilkan toast bila data berubah oleh user lain saat menyimpan (cek `updated_at`).
- Aksesibilitas: status tidak hanya dibedakan warna — badge di sidebar/tabel menampilkan teks label.
- Format tanggal: `DD MMM YYYY HH:mm` WIB.
---
 
## 11. Testing (Definition of Done)
 
- **Unit (Vitest)**: logika renumber (tambah, hapus, reorder, pindah zona), validasi status partial, perhitungan ringkasan.
- **E2E (Playwright)**:
  1. Admin login → buat zona → gambar polygon → tambah 3 perangkat → nomor 1–3.
  2. Reorder 3 → posisi 1 → nomor marker berubah sesuai.
  3. Ubah status ke partial dengan checklist → warna marker oranye → riwayat bertambah.
  4. Guest login → tidak ada tombol mutasi; panggilan action mutasi ditolak.
  5. Export PDF 2 zona → file terunduh dan tidak kosong.
- `typecheck`, `format:check`, `test`, dan `build` lolos.
---
 
## 12. Tahapan Implementasi
 
| Milestone | Isi |
|---|---|
| M0 | Periksa starter `create-next-app` yang ada (§2.0); baca repo referensi bila sudah diisi; rangkum konvensi di `CLAUDE.md` proyek |
| M1 | Lengkapi starter: dependencies versi terbaru, scripts, `output: "standalone"`, Prettier, docker-compose Postgres, Drizzle schema + migrasi, Better Auth + role, `seed-admin`, `seed-dev` |
| M2 | Dashboard, CRUD zona, peta satelit, gambar polygon |
| M3 | Tipe perangkat, tambah/edit/geser perangkat, marker bernomor + badge router, detail, status + riwayat |
| M4 | Sidebar: daftar, filter, pencarian, drag & drop reorder; legend; kotak ringkasan; toggle label |
| M5 | Sumber jaringan + relasi opsional + toggle garis koneksi; `/map` semua zona |
| M6 | Export PNG & PDF via Playwright |
| M7 | Polishing mobile (bottom sheet, mode pindah, posisi saya), manajemen user, test lengkap |
| M9 | Titik kamera (F9): titik di peta, upload foto, popover, galeri fullscreen |
 
Kerjakan berurutan; tiap milestone harus bisa dijalankan dan lolos `typecheck` + `format:check` sebelum lanjut.
 
---
 
## 13. Di Luar Lingkup (fase berikutnya)
 
- Upload foto bukti instalasi per perangkat (foto per titik kamera sudah ada di F9)
- Mode offline / cache tile
- Import/eksport data Excel atau KML
- Realtime collaboration (websocket)
- Notifikasi
 