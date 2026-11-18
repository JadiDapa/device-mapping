/**
 * Application data model. The Better Auth tables live in ./auth-schema.ts
 * and are re-exported here so a single `schema` object can be handed to both
 * drizzle() and the Better Auth adapter.
 *
 * Add your own tables below, then run `npm run db:generate` to create a
 * migration and `npm run db:migrate` to apply it.
 */
export * from "./auth-schema";
