import { describe, expect, it } from "vitest";
import { envSchema } from "./env";

const validEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/device-mapper",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  TRUSTED_ORIGINS: "http://localhost:3000,http://192.168.1.10:3000",
  SEED_ADMIN_EMAIL: "admin@example.com",
  SEED_ADMIN_PASSWORD: "change-me-please",
  TZ: "Asia/Jakarta",
};

describe("envSchema", () => {
  it("accepts a fully valid environment", () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trustedOrigins).toEqual([
        "http://localhost:3000",
        "http://192.168.1.10:3000",
      ]);
    }
  });

  it("rejects a BETTER_AUTH_SECRET shorter than 32 chars", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      BETTER_AUTH_SECRET: "too-short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing DATABASE_URL", () => {
    const { DATABASE_URL: _omit, ...rest } = validEnv;
    expect(envSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a DATABASE_URL that is not a URL", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      DATABASE_URL: "not a url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
    });
    expect(result.success).toBe(false);
  });

  it("accepts both postgres:// and postgresql:// schemes", () => {
    for (const scheme of ["postgres", "postgresql"]) {
      const result = envSchema.safeParse({
        ...validEnv,
        DATABASE_URL: `${scheme}://u:p@localhost:5432/db`,
      });
      expect(result.success).toBe(true);
    }
  });

  it("treats BETTER_AUTH_URL as optional but validates it when present", () => {
    const { BETTER_AUTH_URL: _omit, ...rest } = validEnv;
    expect(envSchema.safeParse(rest).success).toBe(true);
    expect(
      envSchema.safeParse({ ...validEnv, BETTER_AUTH_URL: "nope" }).success,
    ).toBe(false);
  });

  it("does not require SEED_ADMIN_* at runtime (only the seed script does)", () => {
    const { SEED_ADMIN_EMAIL: _e, SEED_ADMIN_PASSWORD: _p, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid SEED_ADMIN_EMAIL when provided", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      SEED_ADMIN_EMAIL: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("no longer knows the SQLite-era variables", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      DATABASE_PATH: "./x.db",
      UPLOAD_DIR: "./u",
      ADMIN_EMAIL: "a@b.co",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("DATABASE_PATH");
      expect(result.data).not.toHaveProperty("UPLOAD_DIR");
      expect(result.data).not.toHaveProperty("ADMIN_EMAIL");
    }
  });

  it("defaults TZ to Asia/Jakarta", () => {
    const { TZ: _omit, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.TZ).toBe("Asia/Jakarta");
  });

  it("defaults TRUSTED_ORIGINS to an empty list when omitted", () => {
    const { TRUSTED_ORIGINS: _omit, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trustedOrigins).toEqual([]);
    }
  });

  it("accepts an optional EXPORT_BASE_URL and treats empty as unset", () => {
    const set = envSchema.parse({
      ...validEnv,
      EXPORT_BASE_URL: "http://127.0.0.1:3000",
    });
    expect(set.EXPORT_BASE_URL).toBe("http://127.0.0.1:3000");
    expect(
      envSchema.parse({ ...validEnv, EXPORT_BASE_URL: "" }).EXPORT_BASE_URL,
    ).toBeUndefined();
    expect(
      envSchema.safeParse({ ...validEnv, EXPORT_BASE_URL: "not a url" })
        .success,
    ).toBe(false);
  });
});
