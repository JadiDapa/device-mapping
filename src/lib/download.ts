import { parseAttachmentFilename } from "./export-filename";

/**
 * Fetch an export endpoint and save the response as a file (client only).
 * Resolves true on success; on a non-2xx response resolves false with the
 * server's message (if any) in `error`.
 */
export async function downloadFile(
  url: string,
  fallbackName: string,
): Promise<{ ok: true } | { ok: false; error: string | null }> {
  const res = await fetch(url);
  if (!res.ok) {
    let error: string | null = null;
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === "string") error = body.error;
    } catch {
      // not JSON: keep the generic message
    }
    return { ok: false, error };
  }
  const name =
    parseAttachmentFilename(res.headers.get("Content-Disposition")) ??
    fallbackName;
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
  return { ok: true };
}
