/**
 * User management (PRD F1). Plain Drizzle, same approach as the admin seed:
 * credentials are stored with Better Auth's own scrypt hashPassword, and
 * "deactivate" sets the admin plugin's banned flag (Better Auth then refuses
 * sign-in) and ends the user's sessions. Authorization lives in the actions.
 */
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import type { Database } from "@/db";
import { account, session, user } from "@/db/schema";
import type { UserRole } from "@/db/auth-schema";
import type { UserCreateInput } from "@/lib/validators/user";
import { hasPgCode } from "./pg";

export class UserEmailTakenError extends Error {
  constructor() {
    super("USER_EMAIL_TAKEN");
    this.name = "UserEmailTakenError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("USER_NOT_FOUND");
    this.name = "UserNotFoundError";
  }
}

/** An admin changing their own role/active state. */
export class SelfModifyError extends Error {
  constructor() {
    super("USER_SELF_MODIFY");
    this.name = "SelfModifyError";
  }
}

/** The change would leave no active admin. */
export class LastAdminError extends Error {
  constructor() {
    super("USER_LAST_ADMIN");
    this.name = "LastAdminError";
  }
}

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  banned: boolean;
  createdAt: Date;
};

export async function listUsers(db: Database): Promise<UserRow[]> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.createdAt), asc(user.email));
}

export async function createUser(
  db: Database,
  input: UserCreateInput,
): Promise<{ id: string }> {
  const hashed = await hashPassword(input.password);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(user)
        .values({
          name: input.name,
          email: input.email,
          emailVerified: true,
          role: input.role,
        })
        .returning({ id: user.id });
      await tx.insert(account).values({
        accountId: row!.id,
        providerId: "credential",
        userId: row!.id,
        password: hashed,
      });
      return { id: row!.id };
    });
  } catch (error) {
    if (hasPgCode(error, "23505")) throw new UserEmailTakenError();
    throw error;
  }
}

/** Another active admin (besides userId) must exist. */
async function assertOtherActiveAdmin(db: Database, userId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(user)
    .where(
      and(eq(user.role, "admin"), eq(user.banned, false), ne(user.id, userId)),
    );
  if (!row || row.n === 0) throw new LastAdminError();
}

async function getTarget(db: Database, userId: string) {
  const [target] = await db
    .select({ id: user.id, role: user.role, banned: user.banned })
    .from(user)
    .where(eq(user.id, userId));
  if (!target) throw new UserNotFoundError();
  return target;
}

export async function setUserRole(
  db: Database,
  actorId: string,
  userId: string,
  role: UserRole,
): Promise<void> {
  const target = await getTarget(db, userId);
  if (actorId === userId) throw new SelfModifyError();
  if (target.role === "admin" && role !== "admin" && !target.banned) {
    await assertOtherActiveAdmin(db, userId);
  }
  await db.update(user).set({ role }).where(eq(user.id, userId));
}

export async function resetUserPassword(
  db: Database,
  userId: string,
  password: string,
): Promise<void> {
  await getTarget(db, userId);
  const hashed = await hashPassword(password);
  await db.transaction(async (tx) => {
    const res = await tx
      .update(account)
      .set({ password: hashed })
      .where(
        and(eq(account.userId, userId), eq(account.providerId, "credential")),
      )
      .returning({ id: account.id });
    if (res.length === 0) {
      await tx.insert(account).values({
        accountId: userId,
        providerId: "credential",
        userId,
        password: hashed,
      });
    }
    // A reset ends the user's existing sessions.
    await tx.delete(session).where(eq(session.userId, userId));
  });
}

export async function setUserActive(
  db: Database,
  actorId: string,
  userId: string,
  active: boolean,
): Promise<void> {
  const target = await getTarget(db, userId);
  if (actorId === userId) throw new SelfModifyError();
  if (!active && target.role === "admin" && !target.banned) {
    await assertOtherActiveAdmin(db, userId);
  }
  await db.transaction(async (tx) => {
    await tx
      .update(user)
      .set({ banned: !active, banReason: null, banExpires: null })
      .where(eq(user.id, userId));
    if (!active) await tx.delete(session).where(eq(session.userId, userId));
  });
}
