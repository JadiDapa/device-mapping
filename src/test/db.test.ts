import { describe, expect, it } from "vitest";
import { resolveTestDatabaseUrl } from "./db";

const base = "postgresql://u:p@localhost:5432";

describe("resolveTestDatabaseUrl", () => {
  it("fails clearly when TEST_DATABASE_URL is missing", () => {
    expect(() => resolveTestDatabaseUrl({})).toThrow(/TEST_DATABASE_URL/);
    expect(() => resolveTestDatabaseUrl({ TEST_DATABASE_URL: "" })).toThrow(
      /TEST_DATABASE_URL/,
    );
  });

  it("refuses the same database as DATABASE_URL (even with other credentials)", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        TEST_DATABASE_URL: `${base}/app-test`,
        DATABASE_URL: `postgresql://other:pw@localhost:5432/app-test`,
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("refuses a database whose name does not contain 'test'", () => {
    expect(() =>
      resolveTestDatabaseUrl({ TEST_DATABASE_URL: `${base}/device-mapper` }),
    ).toThrow(/test/i);
  });

  it("returns a distinct test database URL", () => {
    expect(
      resolveTestDatabaseUrl({
        TEST_DATABASE_URL: `${base}/device-mapper-test`,
        DATABASE_URL: `${base}/device-mapper`,
      }),
    ).toBe(`${base}/device-mapper-test`);
  });
});
