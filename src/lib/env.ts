import { z } from "zod";

/**
 * Validated server environment.
 * Fail fast with a readable message rather than let a
 * misconfigured container boot into a broken state.
 *
 * SEED_ADMIN_* are optional here: only the seed script requires them.
 */
export const envSchema = z
  .object({
    DATABASE_URL: z
      .url("DATABASE_URL must be a valid URL")
      .refine(
        (value) => /^postgres(ql)?:\/\//.test(value),
        "DATABASE_URL must start with postgres:// or postgresql://",
      ),
    // Direct (non-pooled) connection, used by the migrator. Optional.
    DATABASE_URL_UNPOOLED: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined)),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    BETTER_AUTH_URL: z
      .url("BETTER_AUTH_URL must be a valid URL")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    TRUSTED_ORIGINS: z.string().optional().default(""),
    SEED_ADMIN_EMAIL: z
      .email("SEED_ADMIN_EMAIL must be a valid email address")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    SEED_ADMIN_PASSWORD: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined)),
    // Where the export renderer (headless Chromium) reaches this app.
    EXPORT_BASE_URL: z
      .url("EXPORT_BASE_URL must be a valid URL")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    // Local-disk uploads (dev/tests, or when no S3 endpoint is configured).
    UPLOADS_DIR: z.string().optional().default("./data/uploads"),
    // Neon Object Storage (S3-compatible). When AWS_ENDPOINT_URL_S3 is set,
    // uploads go to this bucket instead of UPLOADS_DIR. The AWS_* credentials
    // are read from the environment by the AWS SDK itself.
    AWS_ENDPOINT_URL_S3: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined)),
    STORAGE_BUCKET: z.string().optional().default("assets"),
    TZ: z.string().optional().default("Asia/Jakarta"),
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
