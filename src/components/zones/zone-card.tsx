import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { id } from "@/lib/i18n/id";
import { testedPercent } from "@/lib/summary";
import type { ZoneSummary } from "@/server/zones";
import { StatusProgress } from "./status-progress";

/** Dashboard card (F2). Every number comes from the DB summary query. */
export function ZoneCard({ zone }: { zone: ZoneSummary }) {
  const percent = testedPercent(zone.counts, zone.total);
  return (
    <Link
      href={`/zones/${zone.id}`}
      className="focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-[3px]"
    >
      <Card className="hover:bg-accent/40 h-full transition-colors">
        <CardHeader>
          <CardTitle className="truncate">{zone.name}</CardTitle>
          <CardDescription className="line-clamp-2">
            {zone.description ?? id.dashboard.noDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">
                {id.dashboard.totalDevices}
              </dt>
              <dd className="text-lg font-semibold tabular-nums">
                {zone.total}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">
                {id.dashboard.routers}
              </dt>
              <dd className="text-lg font-semibold tabular-nums">
                {zone.routers}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">
                {id.dashboard.testedPercent}
              </dt>
              <dd className="text-lg font-semibold tabular-nums">{percent}%</dd>
            </div>
          </dl>
          <StatusProgress counts={zone.counts} total={zone.total} />
        </CardContent>
      </Card>
    </Link>
  );
}
