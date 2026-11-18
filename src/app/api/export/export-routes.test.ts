import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { NextRequest } from "next/server";
import { createTestDb, type TestDb } from "@/test/db";
import { zones } from "@/db/schema";
import { UnauthorizedError } from "@/lib/authz";
import { verifyExportToken } from "@/server/export/token";

const SECRET = "t".repeat(32);

const h = vi.hoisted(() => ({
  db: undefined as unknown,
  session: "guest" as "guest" | "admin" | "anon",
  renderPng: vi.fn(),
  renderPdf: vi.fn(),
}));

vi.mock("@/db", () => ({ getDb: () => h.db }));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    BETTER_AUTH_SECRET: "t".repeat(32),
    EXPORT_BASE_URL: "http://127.0.0.1:4321/",
  }),
}));
vi.mock("@/lib/auth", () => ({
  // Export is open to every signed-in role, so both guest and admin pass.
  requireUser: async () => {
    if (h.session === "anon") throw new UnauthorizedError();
    return { user: { id: "u", role: h.session } };
  },
}));
vi.mock("@/server/export/renderer", () => ({
  renderPng: h.renderPng,
  renderPdf: h.renderPdf,
}));

import { GET as getPdf } from "./pdf/route";
import { GET as getPng } from "./png/route";

const NIL = "00000000-0000-4000-8000-000000000000";

describe("export route handlers", () => {
  let t: TestDb;
  let zoneA: string;
  let zoneB: string;

  beforeAll(async () => {
    t = await createTestDb();
    h.db = t.db;
  });

  beforeEach(async () => {
    await t.db.delete(zones);
    const [a] = await t.db
      .insert(zones)
      .values({ name: "Pusri 2B" })
      .returning();
    const [b] = await t.db
      .insert(zones)
      .values({ name: "Pusri 1B" })
      .returning();
    zoneA = a!.id;
    zoneB = b!.id;
    h.session = "guest";
    h.renderPng.mockReset().mockResolvedValue(Buffer.from("PNGDATA"));
    h.renderPdf.mockReset().mockResolvedValue(Buffer.from("%PDF-data"));
  });

  afterAll(async () => {
    await t.close();
  });

  const png = (zone: string | null) =>
    getPng(
      new NextRequest(
        `http://app/api/export/png${zone === null ? "" : `?zone=${zone}`}`,
      ),
    );
  const pdf = (zonesParam: string | null) =>
    getPdf(
      new NextRequest(
        `http://app/api/export/pdf${zonesParam === null ? "" : `?zones=${zonesParam}`}`,
      ),
    );

  it("requires a session (401 without one)", async () => {
    h.session = "anon";
    expect((await png(zoneA)).status).toBe(401);
    expect((await pdf(zoneA)).status).toBe(401);
    expect(h.renderPng).not.toHaveBeenCalled();
    expect(h.renderPdf).not.toHaveBeenCalled();
  });

  it("lets a guest export a zone PNG with the <zona>_<date>.png name", async () => {
    const res = await png(zoneA);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Content-Disposition")).toMatch(
      /filename="Pusri 2B_\d{4}-\d{2}-\d{2}\.png"/,
    );
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe("PNGDATA");
  });

  it("renders the zone's print page with a token that covers only that zone", async () => {
    await png(zoneA);
    const url = new URL(h.renderPng.mock.calls[0]![0] as string);
    expect(url.origin).toBe("http://127.0.0.1:4321");
    expect(url.pathname).toBe(`/print/zones/${zoneA}`);
    const payload = verifyExportToken(url.searchParams.get("token"), SECRET);
    expect(payload?.zones).toEqual([zoneA]);
  });

  it("validates the zone param (422) and 404s an unknown zone", async () => {
    expect((await png(null)).status).toBe(422);
    expect((await png("not-a-uuid")).status).toBe(422);
    expect((await png(NIL)).status).toBe(404);
    expect(h.renderPng).not.toHaveBeenCalled();
  });

  it("exports a PDF for several zones as Rekap_Instalasi_<date>.pdf", async () => {
    const res = await pdf(`${zoneA},${zoneB}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toMatch(
      /filename="Rekap_Instalasi_\d{4}-\d{2}-\d{2}\.pdf"/,
    );
    expect(Number(res.headers.get("Content-Length"))).toBeGreaterThan(0);

    const url = new URL(h.renderPdf.mock.calls[0]![0] as string);
    expect(url.pathname).toBe("/print/report");
    expect(url.searchParams.get("zones")).toBe(`${zoneA},${zoneB}`);
    const payload = verifyExportToken(url.searchParams.get("token"), SECRET);
    expect(payload?.zones).toEqual([zoneA, zoneB]);
  });

  it("validates the PDF zones (422 when empty/malformed, 404 when unknown)", async () => {
    expect((await pdf(null)).status).toBe(422);
    expect((await pdf("")).status).toBe(422);
    expect((await pdf(`${zoneA},nope`)).status).toBe(422);
    expect((await pdf(`${zoneA},${NIL}`)).status).toBe(404);
    expect(h.renderPdf).not.toHaveBeenCalled();
  });

  it("turns a renderer failure into a generic 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.renderPng.mockRejectedValue(new Error("chromium exploded"));
    const res = await png(zoneA);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("chromium");
    spy.mockRestore();
  });
});
