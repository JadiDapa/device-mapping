# PRD Addendum — M8: Design System & UI/UX Polish

> Extends `docs/PRD.md`. Fills the `<<DESIGN_SYSTEM>>` placeholder in §2.1.
> Prerequisite: M0–M7 done, all checks green.
> **UI copy stays in Bahasa Indonesia.** No functional/data-model changes unless listed here.

---

## 0. Inputs

| Item | Location |
|---|---|
| Design tokens (source of truth) | `docs/design/theme.css` (provided by owner) |
| Main PRD | `docs/PRD.md` |

Theme character: deep teal surfaces, soft lime accent, white/off-white sections, pill buttons and badges (`rounded-full`), medium-rounded cards (16px), soft teal-tinted shadows, DM Sans + JetBrains Mono.

---

## 1. Applying the tokens

1. Merge `docs/design/theme.css` into the app's global stylesheet (replace starter tokens, keep `@import "tailwindcss"`, `tw-animate-css`, and any Leaflet/Geoman CSS imports).
2. Load fonts with **`next/font/google`** (self-hosted, no runtime request to Google): `DM_Sans` (400–700) and `JetBrains_Mono`. Expose as CSS variables and point the tokens at them:
   ```css
   --font-sans: var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif;
   --font-mono: var(--font-jetbrains-mono), ui-monospace, monospace;
   ```
   Do **not** load Lora (serif is fallback only, unused).
3. Light/dark via `next-themes` (`attribute="class"`, default `system`), toggle in the user menu.
4. `/print/*` routes always render in **light** theme regardless of user setting.

### 1.1 Required adjustments to the provided tokens (app context)

The theme was derived from a marketing site; these changes make it work for a dense map tool. Apply them in the global stylesheet, and leave a comment pointing to this section.

| # | Issue | Adjustment |
|---|---|---|
| A | **Focus ring contrast.** Lime ring on white is roughly 1.5:1 and fails WCAG 2.2 focus visibility (needs ≥3:1). The base `outline-ring/50` halves it further. | Light mode: `--ring` = deep teal (`--secondary` value). Dark mode: keep lime. Focus style: `focus-visible:outline-2 outline-offset-2 outline-ring` at full opacity. |
| B | **Lime text/icons on white are about 1.3:1 contrast.** The reference design already avoids this. | Follow the reference's lime usage. **On light surfaces:** (1) lime as a **fill** with teal foreground — buttons, active nav. (2) **Lime circle + teal icon** — feature/stat icons, as in the reference's "Company Mission". Use it for dashboard stat tiles and empty states. (3) Pale lime chip (`accent`) with teal text. (4) **Decorative-only accents** — the thin bar above a stat, a small "+" after a number. These are allowed because the meaning is carried by teal text, never by the lime itself. **Not allowed on light surfaces:** lime for any text, label, or icon the user must read. **On teal/dark surfaces:** lime text and icons are allowed. |
| C | **Heading scale is hero-sized** (h1 up to `text-6xl`, body `line-height: 1.6`). | Replace the base heading rules with an app scale: page title `text-2xl`, section `text-lg`, card title `text-base font-semibold`. Panels and tables use `text-sm leading-normal`. Keep `text-wrap: balance/pretty`. |
| D | **Status colors must not come from the brand palette** (lime ≈ "tested" green would confuse users). | Add status tokens, identical in light and dark (they sit on satellite imagery): `--status-not-installed`, `--status-partial`, `--status-installed-untested`, `--status-tested`, plus `@theme inline` mappings (`--color-status-*`). `src/lib/status.ts` keeps labels/order and references these tokens; no hex values elsewhere. |
| E | **Selection highlight must not use a status color.** | Selected marker: white 3px ring + soft lime halo + scale 1.15. Never a green or amber ring. |

---

## 2. Component restyle

Restyle existing UI primitives to the tokens, keeping their props/API stable so feature code doesn't change.

- **Button**: `rounded-full`. Variants: `default` (lime fill / teal text), `secondary` (teal fill / off-white text), `outline`, `ghost`, `destructive`. Sizes `sm` / `default` / `icon`, with a minimum 44px touch target on mobile.
- **Badge / chip**: `rounded-full`. Status badge = status color dot + Indonesian label text, never color alone.
- **Card**: `rounded-lg`, `bg-card`, `shadow-sm`. Map overlay cards (legend, summary, toolbar) use `bg-card/85 backdrop-blur` + `shadow-md`.
- **Inputs / select / textarea**: `rounded-sm`, clear focus (adjustment A), inline error text under the field.
- **Dialog / Sheet / Drawer / Popover / Tooltip**: consistent radius and shadow, `tw-animate-css` enter/exit, respect `prefers-reduced-motion`.
- **Toasts (sonner)**: themed. Success/error/info icons. Undo actions where §4.4 says so.
- **Leaflet controls**: restyle zoom control, attribution, Geoman toolbar, and popups/tooltips to match (card surface, radius, font). Keep attribution visible.

### 2.1 Map markers

| Element | Spec |
|---|---|
| Device marker | 28px circle, status-color fill, white 2px border, `shadow-md`, white number in `font-mono` semibold. Partial status adds a small amber/white split or dashed inner ring, so it also reads without color. |
| Router badge | 14px teal (`--secondary`) circle, lime router icon, top-right |
| Type badge (toggle) | 12px card-surface circle with the type icon, bottom-left |
| Network source | Teal rounded-square marker with lime icon + pill label (`bg-secondary`, off-white text) |
| Connection line | 2px off-white dashed line at 70% opacity; highlighted (lime, solid) when the device or source is selected |
| Location label | Pill below the marker, only at zoom ≥ 18 (avoid clutter) |

---

## 3. App shell & navigation

- **Desktop**: collapsible left sidebar using the `--sidebar-*` tokens (deep teal):
  - Brand at the top.
  - Nav: Dashboard, Peta Semua Zona, Sumber Jaringan, Export, plus an Admin group (Pengguna, Tipe Perangkat).
  - User menu at the bottom: name, role badge, theme toggle, logout.
- **Zone page**: full-bleed map, no page padding. The top bar holds the zone switcher (combobox), breadcrumb, and actions (Export PNG, Edit zona).
- **Mobile**: the sidebar becomes a sheet behind a hamburger. The zone page stays map-first.
- **Guest**: a subtle "Mode lihat saja" badge in the top bar. Mutation controls are not rendered at all (no disabled clutter).
- Per-page `<title>` (`<Halaman> · Device Mapper`), a favicon, and theme-color meta for both themes.

---

## 4. UX improvements

### 4.1 Dashboard
- Totals strip at the top: total devices, % tested, count per status (status tokens), routers.
- Zone cards:
  - Name and description (2 lines max).
  - A large "% sudah diuji" figure.
  - Stacked status bar with a hover tooltip.
  - "Diperbarui 2 jam lalu" (`date-fns` `formatDistance`, `id` locale, WIB).
- Search and sort (name, progress, last updated).
- Empty state: illustration-free; a clear CTA "Buat zona pertama" (admin) or an explanatory message (guest).

### 4.2 Map workspace (zone page)
- **Floating mode toolbar** (admin): Lihat · Tambah Perangkat · Tambah Sumber · Pindah · Edit Batas.
  - The active mode shows a top banner such as "Klik peta untuk menaruh perangkat #22 · Esc untuk batal", plus a crosshair cursor.
  - Only one mode can be active at a time.
- **Keyboard shortcuts** (desktop; ignored while typing in inputs):

  | Key | Action |
  |---|---|
  | `N` | Add device |
  | `S` | Add source |
  | `M` | Move mode |
  | `F` | Fit to zone |
  | `L` | Toggle legend |
  | `/` | Focus search |
  | `Esc` | Cancel mode / close panel |
  | `?` | Shortcuts dialog |

- **Hover tooltip** on a marker: number, type, location detail, status.
- **Selection sync**: selecting in the list or on the map highlights both, scrolls the list into view, and pans the map only if the marker is off-screen. Use `setView` instead of `flyTo` under reduced motion.
- **Summary box and legend**: collapsible, with state remembered.
- **Outside-polygon warning**: inline amber callout in the form, not a blocking dialog.

### 4.3 Device panel
- Header: big number, type, router badge, status badge.
- **Status stepper**: 4 horizontal steps (1→4), so the current stage is obvious and one tap changes it. Partial shows Power/FO/Ethernet as toggle chips + note.
- Sections: Detail, Koneksi (network source), Riwayat (timeline style with relative + absolute time).
- Unsaved-changes guard when closing the panel with dirty form state.

### 4.4 Feedback & safety
- **Optimistic updates** with rollback + error toast on failure (status, move, reorder).
- **Undo toast (5s)** for: status change, reorder, marker move. Undo performs the reverse mutation; it is recorded in history like any change.
- Delete actions keep a confirm dialog (device: simple confirm; zone: type-name confirm). No undo needed.
- Pending states: buttons show a spinner and are disabled; no double submit.

### 4.5 Loading, empty, error
- `loading.tsx` skeletons for dashboard, zone page (sidebar list skeleton + map placeholder until tiles load), and admin tables.
- `error.tsx` per segment with an Indonesian message + "Coba lagi"; a global `not-found.tsx`.
- Empty states:
  - Zone without a boundary → CTA "Gambar batas zona".
  - Zone without devices → CTA "Tambah perangkat pertama".
  - Filters with no results → "Reset filter".

### 4.6 Mobile
- **Bottom sheet** with 3 snap points:
  - Peek: the selected device's number, status, and the stepper.
  - Half: the list.
  - Full: the detail.
- **FAB** (admin) for add, which opens a small menu: Perangkat / Sumber / Di posisi saya.
- Respect safe-area insets; 44px minimum targets; no hover-only affordances.

### 4.7 Export & print
- `/export`: zone checklist with progress per zone, a preview thumbnail, and generate buttons that show progress state and toasts.
- The print layout uses the tokens (light theme). The header has the app name, zone, and date in WIB; the footer has page numbers.

---

## 5. Accessibility

- Add `@axe-core/playwright`. Key pages must have **0 serious/critical violations** in light and dark.
- Status is never conveyed by color alone (text label in lists/tables, a shape cue on partial markers).
- All interactive controls are reachable by keyboard. The device list is the keyboard-accessible alternative to clicking markers.
- Color contrast: text ≥ 4.5:1, UI components and focus ≥ 3:1. Verify that `muted-foreground` on `card` passes.

---

## 6. Acceptance & visual QA

1. `typecheck`, `format:check`, `test`, `test:e2e`, `build` all green.
2. Axe checks pass (§5).
3. A Playwright script `scripts/screenshots.ts` captures, for owner review:
   - **Screens:** Login, Dashboard, Zone page (no selection), Zone page (device selected, partial status), Add-device mode, Device panel, Export page, Print page.
   - **Variants:** each screen in **light and dark**, at **1440×900 and 390×844**.
   - **Output:** `docs/screenshots/`.
   - **Tiles:** stub the tile layer with a neutral local tile in tests/screenshots (no network flakiness).
4. No hardcoded colors outside the token file and `src/lib/status.ts` (grep check in CI or a test).
5. Existing E2E flows from PRD §11 still pass unchanged.

---

## 7. Milestones

| Milestone | Scope |
|---|---|
| M8.1 | Tokens + fonts + adjustments A–E, primitive restyle (§2), Leaflet control theming, dark mode, print forced light |
| M8.2 | App shell & navigation (§3), dashboard (§4.1), loading/empty/error states (§4.5) |
| M8.3 | Map workspace + markers (§2.1, §4.2), device panel (§4.3), feedback & undo (§4.4) |
| M8.4 | Mobile pass (§4.6), export/print polish (§4.7), accessibility (§5), screenshots + acceptance (§6) |

Do them in order. After each: run the checks, regenerate the affected screenshots, and summarize deviations.

---

## 8. Optional — M9 Production hardening (non-UI)

- Env validation at boot (Zod), fail fast with a clear message.
- Better Auth rate limiting on login; security headers (CSP allowing the tile host, HSTS, frame-ancestors).
- `/api/health` (DB ping).
- Dockerfile for standalone output including Chromium for export.
- Structured server logs for mutations/export failures.
- README: deploy, backup/restore PostgreSQL, rotate secrets.