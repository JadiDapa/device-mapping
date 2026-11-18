import { notFound } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { DeleteZoneDialog } from "@/components/zones/delete-zone-dialog";
import { ZoneForm } from "@/components/zones/zone-form";
import { requireAdminPage } from "@/lib/auth";
import { id } from "@/lib/i18n/id";
import { getZone } from "@/server/zones";

export default async function EditZonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id: zoneId } = await params;
  if (!z.string().uuid().safeParse(zoneId).success) notFound();

  const zone = await getZone(getDb(), zoneId);
  if (!zone) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{id.zone.editTitle}</h1>
      <ZoneForm
        zone={{
          id: zone.id,
          name: zone.name,
          description: zone.description,
          boundary: zone.boundary,
          centerLat: zone.centerLat,
          centerLng: zone.centerLng,
          defaultZoom: zone.defaultZoom,
          updatedAt: zone.updatedAt.toISOString(),
        }}
      />
      <section className="border-destructive/40 space-y-3 rounded-lg border p-4">
        <h2 className="text-destructive font-semibold">
          {id.zone.dangerTitle}
        </h2>
        <p className="text-muted-foreground text-sm">
          {id.zone.dangerDescription}
        </p>
        <DeleteZoneDialog zoneId={zone.id} zoneName={zone.name} />
      </section>
    </main>
  );
}
