# Next.js Starter

Self-hostable starter: Next.js (App Router) + SQLite + email/password auth,
with Docker. Click **Use this template** on GitHub, or copy the folder and
`git init`.

## Stack

Next.js 16 (Turbopack, `proxy.ts`) · React 19 · TypeScript · Tailwind v4 ·
shadcn/ui · Drizzle + better-sqlite3 (Node >= 22) · Better Auth (single
seeded admin, sign-up disabled) · Zod 4 + React Hook Form · Vitest · Prettier.

## Quick start

```bash
cp .env.example .env        # set BETTER_AUTH_SECRET (32+ chars) and ADMIN_*
npm install
npm run db:migrate
npm run db:seed             # creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev                 # http://localhost:3000 -> /login
```

## Commands

| Command                                | What it does                          |
| -------------------------------------- | ------------------------------------- |
| `npm run dev` / `build` / `start`      | Next.js dev / production build / run  |
| `npm run typecheck`                    | `tsc --noEmit`                        |
| `npm test`                             | Vitest                                |
| `npm run db:generate`                  | New Drizzle migration from the schema |
| `npm run db:migrate` / `db:seed`       | Apply migrations / seed the admin     |
| `npm run format` / `format:check`      | Prettier                              |
| `docker compose up -d --build`         | Run in Docker (migrate + seed on boot) |

## Layout

- `app/` — routes: `/login`, `/admin/*` (session-gated), `/api/auth`, `/api/health`
- `lib/db/` — `schema.ts` (your tables), `auth-schema.ts` (Better Auth), `index.ts` (lazy connection)
- `lib/auth.ts`, `lib/auth-client.ts`, `lib/env.ts` (validated env)
- `lib/i18n/id.ts` — all UI labels (Bahasa Indonesia); never inline strings
- `components/ui/` — shadcn components
- `scripts/` — `migrate.ts`, `seed-admin.ts`
- `proxy.ts` — optimistic cookie check for `/admin/*`; the real gate is `getSession()` in `app/admin/layout.tsx`

## Making it yours

1. Rename in `package.json`, `app/layout.tsx` (title), `docker-compose.yml`, `.env.example`.
2. Add tables to `lib/db/schema.ts`, then `npm run db:generate`.
3. Replace the dashboard in `app/admin/page.tsx` and the redirect in `app/page.tsx`.
4. Rewrite `CLAUDE.md` for your project.
5. Change `lib/auth.ts` `baseURL.allowedHosts` if you deploy behind a real domain (it currently trusts localhost and private LAN ranges over http).
