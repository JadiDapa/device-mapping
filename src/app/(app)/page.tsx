import Link from "next/link";
import { MapIcon, PlusIcon } from "lucide-react";
import { getDb } from "@/db";
import { Button } from "@/components/ui/button";
import { ZoneCard } from "@/components/zones/zone-card";
import { requireUser } from "@/lib/auth";
import { id } from "@/lib/i18n/id";
import { listZoneSummaries } from "@/server/zones";

export default async function DashboardPage() {
  const session = await requireUser({ redirectTo: "/login" });
  const isAdmin = session.user.role === "admin";
  const zones = await listZoneSummaries(getDb());

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{id.dashboard.title}</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/map">
              <MapIcon />
              {id.allMap.viewAll}
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild>
              <Link href="/zones/new">
                <PlusIcon />
                {id.dashboard.newZone}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {zones.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          {isAdmin ? id.dashboard.emptyAdmin : id.dashboard.empty}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <ZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
      )}
    </main>
  );
}
