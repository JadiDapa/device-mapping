import { notFound } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { MapReadyGate } from "@/components/print/map-ready-gate";
import { PrintZoneMap } from "@/components/print/print-zone-map";
import { getEnv } from "@/lib/env";
import { listZoneDevices } from "@/server/devices";
import { tokenCoversZones, verifyExportToken } from "@/server/export/token";
import { listSourcesForZone } from "@/server/network-sources";
import { getZone, getZoneSummary } from "@/server/zones";

/**
 * Internal page for the PNG export: one zone on a fixed 1600 x 1000 canvas.
 * Not behind the app session; it requires a signed, short-lived export token
 * that covers this zone (a missing/invalid token is a 404).
 */
export default async function PrintZonePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id: zoneId } = await params;
  const { token } = await searchParams;
  if (!z.string().uuid().safeParse(zoneId).success) notFound();
  const payload = verifyExportToken(token, getEnv().BETTER_AUTH_SECRET);
  if (!tokenCoversZones(payload, [zoneId])) notFound();

  const db = getDb();
  const zone = await getZone(db, zoneId);
  if (!zone) notFound();
  const [devices, sources, summary] = await Promise.all([
    listZoneDevices(db, zoneId),
    listSourcesForZone(db, zoneId),
    getZoneSummary(db, zoneId),
  ]);

  return (
    <main
      data-testid="print-zone"
      className="bg-background h-[1000px] w-[1600px] overflow-hidden"
    >
      <MapReadyGate maps={1} />
      <PrintZoneMap
        mapKey={zone.id}
        zone={{ name: zone.name, boundary: zone.boundary }}
        devices={devices}
        sources={sources}
        summary={
          summary ?? {
            total: 0,
            routers: 0,
            counts: {
              not_installed: 0,
              partial: 0,
              installed_untested: 0,
              tested: 0,
            },
          }
        }
      />
    </main>
  );
}
