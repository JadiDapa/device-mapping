import { getDb } from "@/db";
import { DeviceTypesManager } from "@/components/devices/device-types-manager";
import { requireAdminPage } from "@/lib/auth";
import { id } from "@/lib/i18n/id";
import { listDeviceTypes } from "@/server/device-types";

export default async function DeviceTypesPage() {
  await requireAdminPage();
  const types = await listDeviceTypes(getDb());

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{id.deviceType.title}</h1>
      <DeviceTypesManager
        types={types.map((t) => ({
          id: t.id,
          name: t.name,
          icon: t.icon,
          description: t.description,
          usageCount: t.usageCount,
        }))}
      />
    </main>
  );
}
