import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/authz";
import { contentTypeForKey, isValidKey, openFile } from "@/server/storage";

export const runtime = "nodejs";

/**
 * Serves uploaded images to signed-in users only (the app sits behind login,
 * so the files must too). Keys never change content, hence immutable caching.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ key: string[] }> },
) {
  try {
    await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    throw error;
  }
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!isValidKey(key)) return new NextResponse(null, { status: 404 });
  const file = await openFile(key);
  if (!file) return new NextResponse(null, { status: 404 });
  return new NextResponse(file.stream, {
    headers: {
      "Content-Type": contentTypeForKey(key),
      "Content-Length": String(file.size),
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
