import { describe, expect, it } from "vitest";
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
    for (const area of ["nav", "auth", "admin", "common"]) {
      expect(id).toHaveProperty(area);
    }
  });

  it.each(leaves)("label %s is a non-empty string", (_path, value) => {
    expect(typeof value).toBe("string");
    expect((value as string).length).toBeGreaterThan(0);
  });
});
