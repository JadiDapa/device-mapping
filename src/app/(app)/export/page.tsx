import { getDb } from "@/db";
import { ExportForm } from "@/components/export/export-form";
import { requireUser } from "@/lib/auth";
import { id } from "@/lib/i18n/id";
import { listZoneSummaries } from "@/server/zones";

export default async function ExportPage() {
  await requireUser({ redirectTo: "/login" });
  const zones = await listZoneSummaries(getDb());

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">{id.export.title}</h1>
        <p className="text-muted-foreground text-sm">{id.export.description}</p>
      </div>
      <ExportForm
        zones={zones.map((z) => ({ id: z.id, name: z.name, total: z.total }))}
      />
    </main>
  );
}
