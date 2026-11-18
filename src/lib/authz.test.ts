import { describe, expect, it } from "vitest";
import {
  ForbiddenError,
  UnauthorizedError,
  assertRole,
  type SessionLike,
} from "./authz";

const admin: SessionLike = { user: { id: "1", role: "admin" } };
const guest: SessionLike = { user: { id: "2", role: "guest" } };

describe("assertRole", () => {
  it("lets an admin through for the admin role", () => {
    expect(() => assertRole(admin, "admin")).not.toThrow();
  });

  it("rejects a guest for the admin role with a 403", () => {
    try {
      assertRole(guest, "admin");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError);
      expect((error as ForbiddenError).status).toBe(403);
    }
  });

  it("rejects a missing session with a 401", () => {
    try {
      assertRole(null, "admin");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect((error as UnauthorizedError).status).toBe(401);
    }
  });

  it("rejects a missing session even for the guest role", () => {
    expect(() => assertRole(null, "guest")).toThrow(UnauthorizedError);
    expect(() => assertRole(undefined, "guest")).toThrow(UnauthorizedError);
  });

  it("lets any signed-in user through for the guest role", () => {
    expect(() => assertRole(guest, "guest")).not.toThrow();
    expect(() => assertRole(admin, "guest")).not.toThrow();
  });

  it("treats a user with an unknown or missing role as a guest, never admin", () => {
    const noRole: SessionLike = { user: { id: "3", role: null } };
    const weird: SessionLike = { user: { id: "4", role: "superuser" } };
    expect(() => assertRole(noRole, "guest")).not.toThrow();
    expect(() => assertRole(noRole, "admin")).toThrow(ForbiddenError);
    expect(() => assertRole(weird, "admin")).toThrow(ForbiddenError);
  });

  it("returns the session so callers can use it after the check", () => {
    expect(assertRole(admin, "admin")).toBe(admin);
  });
});
