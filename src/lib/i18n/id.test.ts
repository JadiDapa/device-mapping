import { describe, expect, it } from "vitest";
import { USER_ROLES } from "@/db/auth-schema";
import { DEVICE_STATUSES, PARTIAL_COMPONENTS } from "../status";
import { id } from "./id";

// Every label must be present and non-empty so no UI text silently falls
// back to "undefined".
function collectLeafValues(
  value: unknown,
  path: string[] = [],
): [string, unknown][] {
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, v]) => collectLeafValues(v, [...path, key]),
    );
  }
  return [[path.join("."), value]];
}

describe("lib/i18n/id", () => {
  const leaves = collectLeafValues(id);

  it("has the core label areas", () => {
    for (const area of [
      "nav",
      "auth",
      "admin",
      "common",
      "app",
      "status",
      "partialComponent",
      "role",
    ]) {
      expect(id).toHaveProperty(area);
    }
  });

  it("has a label for every device status, partial component and role", () => {
    expect(Object.keys(id.status).sort()).toEqual([...DEVICE_STATUSES].sort());
    expect(Object.keys(id.partialComponent).sort()).toEqual(
      [...PARTIAL_COMPONENTS].sort(),
    );
    expect(Object.keys(id.role).sort()).toEqual([...USER_ROLES].sort());
  });

  it.each(leaves)("label %s is a non-empty string", (_path, value) => {
    expect(typeof value).toBe("string");
    expect((value as string).length).toBeGreaterThan(0);
  });
});
