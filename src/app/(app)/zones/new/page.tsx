import { ZoneForm } from "@/components/zones/zone-form";
import { requireAdminPage } from "@/lib/auth";
import { id } from "@/lib/i18n/id";

export default async function NewZonePage() {
  await requireAdminPage();
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{id.zone.newTitle}</h1>
      <ZoneForm />
    </main>
  );
}
