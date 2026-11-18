import { notFound } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { SourcePage } from "@/components/sources/source-page";
import { requireUser } from "@/lib/auth";
import {
  getNetworkSource,
  listSourceDevices,
  listSourceKinds,
} from "@/server/network-sources";
import { listZoneOptions } from "@/server/zones";

export default async function NetworkSourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser({ redirectTo: "/login" });
  const { id: sourceId } = await params;
  if (!z.string().uuid().safeParse(sourceId).success) notFound();

  const db = getDb();
  const source = await getNetworkSource(db, sourceId);
  if (!source) notFound();

  const [devices, zones, kinds] = await Promise.all([
    listSourceDevices(db, sourceId),
    listZoneOptions(db),
    listSourceKinds(db),
  ]);
  const zoneName = zones.find((z) => z.id === source.zoneId)?.name ?? null;

  return (
    <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <SourcePage
        source={{
          id: source.id,
          name: source.name,
          kind: source.kind,
          description: source.description,
          zoneId: source.zoneId,
          zoneName,
          lat: source.lat,
          lng: source.lng,
          updatedAt: source.updatedAt,
        }}
        devices={devices}
        zones={zones}
        kinds={kinds}
        isAdmin={session.user.role === "admin"}
      />
    </main>
  );
}
