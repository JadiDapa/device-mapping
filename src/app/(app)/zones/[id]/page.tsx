import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { z } from "zod";
import { getDb } from "@/db";
import { MapView } from "@/components/map";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { id } from "@/lib/i18n/id";
import { getZone } from "@/server/zones";

export default async function ZonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser({ redirectTo: "/login" });
  const { id: zoneId } = await params;
  if (!z.string().uuid().safeParse(zoneId).success) notFound();

  const zone = await getZone(getDb(), zoneId);
  if (!zone) notFound();

  const isAdmin = session.user.role === "admin";
  const center =
    zone.centerLat != null && zone.centerLng != null
      ? { lat: zone.centerLat, lng: zone.centerLng }
      : null;

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-4 border-b p-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{zone.name}</h1>
          {zone.description && (
            <p className="text-muted-foreground text-sm">{zone.description}</p>
          )}
          {!zone.boundary && (
            <p className="text-muted-foreground text-xs">
              {id.zone.noBoundary}
            </p>
          )}
        </div>
        {isAdmin && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/zones/${zone.id}/edit`}>
              <PencilIcon />
              {id.common.edit}
            </Link>
          </Button>
        )}
      </div>
      <div className="relative min-h-96 flex-1">
        <MapView
          boundary={zone.boundary}
          center={center}
          zoom={zone.defaultZoom}
          className="absolute inset-0 rounded-none"
        />
      </div>
    </main>
  );
}
