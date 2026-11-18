import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "GET /api/health returns 200 when the database is reachable;
 * used by the Docker healthcheck."
 */
export async function GET() {
  try {
    getSqlite().prepare("SELECT 1").get();
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: (error as Error).message },
      { status: 503 },
    );
  }
}
