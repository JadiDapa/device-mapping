import { notFound } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { ZoneWorkspace } from "@/components/devices/zone-workspace";
import { requireUser } from "@/lib/auth";
import { listDeviceTypes } from "@/server/device-types";
import { listZoneDevices } from "@/server/devices";
import { getZone, getZoneSummary, listZoneOptions } from "@/server/zones";

export default async function ZonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser({ redirectTo: "/login" });
  const { id: zoneId } = await params;
  if (!z.string().uuid().safeParse(zoneId).success) notFound();

  const db = getDb();
  const zone = await getZone(db, zoneId);
  if (!zone) notFound();

  const [devices, types, summary, zoneOptions] = await Promise.all([
    listZoneDevices(db, zoneId),
    listDeviceTypes(db),
    getZoneSummary(db, zoneId),
    listZoneOptions(db),
  ]);

  const center =
    zone.centerLat != null && zone.centerLng != null
      ? { lat: zone.centerLat, lng: zone.centerLng }
      : null;

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <ZoneWorkspace
        zone={{
          id: zone.id,
          name: zone.name,
          description: zone.description,
          boundary: zone.boundary,
          center,
          zoom: zone.defaultZoom,
        }}
        devices={devices}
        types={types.map((t) => ({ id: t.id, name: t.name, icon: t.icon }))}
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
        otherZones={zoneOptions.filter((z) => z.id !== zone.id)}
        isAdmin={session.user.role === "admin"}
      />
    </main>
  );
}
