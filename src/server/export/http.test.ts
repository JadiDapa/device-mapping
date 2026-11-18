import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/authz";
import { ZoneNotFoundError } from "@/server/zones";
import { exportErrorResponse, fileResponse } from "./http";

describe("exportErrorResponse", () => {
  it("maps known errors to real HTTP statuses", async () => {
    expect(exportErrorResponse(new UnauthorizedError()).status).toBe(401);
    expect(exportErrorResponse(new ForbiddenError()).status).toBe(403);
    expect(exportErrorResponse(new ZodError([])).status).toBe(422);
    expect(exportErrorResponse(new ZoneNotFoundError()).status).toBe(404);
  });

  it("hides the details of unexpected errors behind a 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = exportErrorResponse(new Error("secret internals"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
    spy.mockRestore();
  });
});

describe("fileResponse", () => {
  it("is a no-store attachment with the content length", () => {
    const res = fileResponse(Buffer.from("abc"), "image/png", "Zona_2026.png");
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Content-Length")).toBe("3");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Content-Disposition")).toContain(
      'filename="Zona_2026.png"',
    );
  });
});
