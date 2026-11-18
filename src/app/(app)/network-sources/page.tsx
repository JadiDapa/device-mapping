import { getDb } from "@/db";
import { SourcesList } from "@/components/sources/sources-list";
import { requireUser } from "@/lib/auth";
import { listNetworkSources, listSourceKinds } from "@/server/network-sources";
import { listZoneOptions } from "@/server/zones";

export default async function NetworkSourcesPage() {
  const session = await requireUser({ redirectTo: "/login" });
  const db = getDb();
  const [sources, zones, kinds] = await Promise.all([
    listNetworkSources(db),
    listZoneOptions(db),
    listSourceKinds(db),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <SourcesList
        sources={sources.map((s) => ({
          id: s.id,
          name: s.name,
          kind: s.kind,
          zoneName: s.zoneName,
          deviceCount: s.deviceCount,
        }))}
        zones={zones}
        kinds={kinds}
        isAdmin={session.user.role === "admin"}
      />
    </main>
  );
}
