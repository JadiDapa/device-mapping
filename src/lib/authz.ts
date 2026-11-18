import { USER_ROLES, type UserRole } from "@/db/auth-schema";

/**
 * Pure authorization helpers (no env/DB access) so they can be unit-tested
 * and shared by every Server Action / Route Handler.
 */
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "UNAUTHORIZED") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "FORBIDDEN") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type SessionLike = {
  user: { id: string; role?: string | null };
};

function normalizeRole(role: string | null | undefined): UserRole {
  return (USER_ROLES as readonly string[]).includes(role ?? "")
    ? (role as UserRole)
    : "guest";
}

/**
 * Throws UnauthorizedError (401) without a session, ForbiddenError (403) when
 * the session's role is insufficient. `admin` satisfies `guest`; anything that
 * is not a known role is treated as `guest`, never `admin`.
 */
export function assertRole<S extends SessionLike>(
  session: S | null | undefined,
  required: UserRole,
): S {
  if (!session) throw new UnauthorizedError();
  if (required === "admin" && normalizeRole(session.user.role) !== "admin") {
    throw new ForbiddenError();
  }
  return session;
}
