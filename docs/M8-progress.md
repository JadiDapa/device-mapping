# M8 Progress

Resume rule: continue from the first unticked item.

## Decisions

1. i18n: `src/lib/i18n/id.ts` stays the entry; per-area modules wired into `id`; each WP owns its module.
2. New deps (installed at setup): `@axe-core/playwright` 4.14.0, `cmdk` 1.1.1 (zone switcher). No `vaul`; mobile bottom sheet is custom (3 snaps).
3. "Edit Batas" toolbar entry links to `/zones/[id]/edit` (existing Geoman flow); no new in-map draw mode.
4. Status hex → `--status-*` tokens; `status.ts` references `var(--status-*)`; hardcoded-colour guard test allows only globals.css/theme.css + status.ts.
5. Print forced light via `.light` scope on the print layout + renderer `colorScheme: "light"`.
6. Export preview thumbnail = inline SVG (boundary + device dots), no tiles.
7. Commit format `M8.x: <summary>` (user instruction overrides Conventional Commits for this run).
8. Baseline before M8: typecheck/format(after prettier on theme.css)/unit (561) green; e2e: 2 pass, `export.spec.ts` (PDF 2 zones) FAILS with 200s download timeout (pre-existing, likely tile network in headless export). To be fixed via tile stub in M8.1.

## Setup
- [x] CLAUDE.md updated
- [x] Deps installed (axe, cmdk), `screenshots` script added
- [x] Baseline recorded

## M8.1 — tokens, fonts, A–E, primitives, Leaflet theming, dark, print light
Work packages (exclusive ownership):
- WP1.1 Tokens & theme: `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/status.ts`, `src/lib/status.test.ts`, `src/app/print/layout.tsx`, `src/server/export/renderer.ts`, `src/lib/no-hardcoded-colors.test.ts`
- WP1.2 Primitives: `src/components/ui/*`, `src/components/devices/status-badge.tsx`, `src/components/devices/seq-badge.tsx`
- WP1.3 QA tooling: `scripts/screenshots.ts`, `e2e/fixtures/*`, `e2e/tile-stub.ts`
Checklist:
- [x] WP1.1  - [x] WP1.2  - [x] WP1.3
- [x] typecheck / format:check / test / build  - [ ] test:e2e (stopped by user: 'cukup e2e'; export.spec fails pre-M8, devices.spec assertion updated to var(--status-partial), unverified)
- [ ] screenshots (no server run; user asked to stop servers)  - [ ] review  - [ ] fixes  - [x] commit

## M8.2 — shell & nav, dashboard, loading/empty/error
(WP split written at stage start)
- [ ] all

## M8.3 — markers & map, workspace, device panel, feedback & undo
- [ ] all

## M8.4 — mobile, export/print, a11y, acceptance
- [ ] all

## Deviations log
- M8.1: `e2e/devices.spec.ts` marker colour assertion changed from `#F59E0B` to `var(--status-partial)` (hex moved to tokens per §1.1 D).
- M8.1: export.spec.ts timeout persists (dev server HMR/export artifact; renderPdf works standalone). Not resolved.
- M8.1: screenshots + review not done; user stopped e2e/servers.
- Added `viewport.themeColor` hex in layout.tsx (allowlisted in guard test).

## Open review findings
(none yet)
