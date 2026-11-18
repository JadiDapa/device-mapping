import { describe, expect, it } from "vitest";
import { envSchema } from "./env";

const validEnv = {
  DATABASE_PATH: "/app/data/app.db",
  UPLOAD_DIR: "/app/data/uploads",
  BETTER_AUTH_SECRET: "a".repeat(32),
  TRUSTED_ORIGINS: "http://localhost:3000,http://192.168.1.10:3000",
  ADMIN_EMAIL: "admin@example.com",
  ADMIN_PASSWORD: "change-me-please",
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

  it("rejects a missing ADMIN_EMAIL", () => {
    const { ADMIN_EMAIL, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid ADMIN_EMAIL", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      ADMIN_EMAIL: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing ADMIN_PASSWORD", () => {
    const { ADMIN_PASSWORD, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("defaults DATABASE_PATH and UPLOAD_DIR when omitted", () => {
    const { DATABASE_PATH, UPLOAD_DIR, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_PATH).toBe("./data/app.db");
      expect(result.data.UPLOAD_DIR).toBe("./data/uploads");
    }
  });

  it("defaults TRUSTED_ORIGINS to an empty list when omitted", () => {
    const { TRUSTED_ORIGINS, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trustedOrigins).toEqual([]);
    }
  });
});
