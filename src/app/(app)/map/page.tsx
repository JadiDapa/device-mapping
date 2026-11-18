import { getDb } from "@/db";
import { AllZonesMap } from "@/components/map";
import { requireUser } from "@/lib/auth";
import { id } from "@/lib/i18n/id";
import { listAllMapDevices } from "@/server/devices";
import { listNetworkSources } from "@/server/network-sources";
import { listZoneBoundaries } from "@/server/zones";

export default async function AllZonesMapPage() {
  await requireUser({ redirectTo: "/login" });
  const db = getDb();
  const [zones, devices, sources] = await Promise.all([
    listZoneBoundaries(db),
    listAllMapDevices(db),
    listNetworkSources(db),
  ]);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">{id.allMap.title}</h1>
      <div className="relative h-[calc(100dvh-3.5rem)]">
        <AllZonesMap
          zones={zones}
          devices={devices}
          sources={sources.map((s) => ({
            id: s.id,
            name: s.name,
            lat: s.lat,
            lng: s.lng,
          }))}
        />
      </div>
    </main>
  );
}
