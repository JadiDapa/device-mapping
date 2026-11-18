# Next.js Starter

Template: Next.js App Router + SQLite (Drizzle) + Better Auth. See `README.md`.

## Commands

`npm run dev|build|start` · `npm run typecheck` · `npm test` ·
`npm run db:generate|db:migrate|db:seed` · `npm run format`

## Conventions

- Next.js 16: `proxy.ts`, not `middleware.ts`. Node >= 22.
- All UI text lives in `lib/i18n/id.ts` — never inline strings.
- Write tests before implementation for logic (Vitest). Config and pure wiring don't need tests.
- DB and auth are built lazily (`getDb()`, `getAuth()`, `getEnv()`) so `next build` never needs runtime env or a database. Keep it that way.
- No `async` callbacks inside `better-sqlite3` transactions.
- `better-sqlite3` is already in Next's default `serverExternalPackages` — don't re-add it.
- Real auth gate is `getSession()` in `app/admin/layout.tsx`; `proxy.ts` is optimistic only.
- Migrations are committed (`drizzle/`) and applied by the runtime migrator, not drizzle-kit.

## Git

Commit finished units of work with Conventional Commits. Don't push or amend without asking.
