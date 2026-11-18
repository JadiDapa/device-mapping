import { z } from "zod";

/**
 * Validated environment.
 * Fail fast with a readable message rather than let a
 * misconfigured container boot into a broken state.
 */
export const envSchema = z
  .object({
    DATABASE_PATH: z.string().min(1).default("./data/app.db"),
    UPLOAD_DIR: z.string().min(1).default("./data/uploads"),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    TRUSTED_ORIGINS: z.string().optional().default(""),
    ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email address"),
    ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD is required"),
    TZ: z.string().optional().default("UTC"),
  })
  .transform((env) => ({
    ...env,
    trustedOrigins: env.TRUSTED_ORIGINS
      ? env.TRUSTED_ORIGINS.split(",")
          .map((origin) => origin.trim())
          .filter(Boolean)
      : [],
  }));

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${message}`);
  }
  cached = result.data;
  return cached;
}
