import { getDb } from "@/db";
import { AllZonesMap } from "@/components/map";
import { requireUser } from "@/lib/auth";
import { id } from "@/lib/i18n/id";
import { listAllMapDevices } from "@/server/devices";
import { listAllExtenders } from "@/server/extenders";
import { listNetworkSources } from "@/server/network-sources";
import { listZoneBoundaries, listZoneSummaries } from "@/server/zones";

/**
 * Root: full-screen satellite map covering every zone. Clicking a zone flies
 * in and opens its details + devices in a panel.
 */
export default async function DashboardPage() {
  const session = await requireUser({ redirectTo: "/login" });
  const db = getDb();
  const [summaries, extenders, zones, devices, sources] = await Promise.all([
    listZoneSummaries(db),
    listAllExtenders(db),
    listZoneBoundaries(db),
    listAllMapDevices(db),
    listNetworkSources(db),
  ]);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">{id.dashboard.title}</h1>
      <div className="relative h-[calc(100dvh-3.5rem)]">
        <AllZonesMap
          zones={zones}
          devices={devices}
          summaries={summaries}
          extenders={extenders}
          isAdmin={session.user.role === "admin"}
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
