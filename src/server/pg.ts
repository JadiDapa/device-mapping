/** True when the error (or a wrapped `cause`) carries this Postgres SQLSTATE. */
export function hasPgCode(error: unknown, code: string): boolean {
  let e: unknown = error;
  for (let i = 0; i < 4 && e; i++) {
    if (typeof e === "object" && (e as { code?: unknown }).code === code) {
      return true;
    }
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

/** Name of the violated constraint (postgres.js `constraint_name`), if any. */
export function pgConstraint(error: unknown): string | undefined {
  let e: unknown = error;
  for (let i = 0; i < 4 && e; i++) {
    const name = (e as { constraint_name?: unknown }).constraint_name;
    if (typeof name === "string") return name;
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}
