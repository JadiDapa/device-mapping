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
