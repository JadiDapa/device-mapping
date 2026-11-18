/**
 * How a device is wired to its router (or, for a router, to its network
 * source). Dependency-free so the DB schema (drizzle-kit) can import it;
 * labels live in ./connection.ts.
 */
export const CONNECTION_TYPES = ["lan_poe", "fiber_optic", "wifi"] as const;
export type ConnectionType = (typeof CONNECTION_TYPES)[number];
export const DEFAULT_CONNECTION_TYPE: ConnectionType = "lan_poe";
