import { notFound } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { DeviceTable } from "@/components/print/device-table";
import { MapReadyGate } from "@/components/print/map-ready-gate";
import { PrintZoneMap } from "@/components/print/print-zone-map";
import { formatWib } from "@/lib/date";
import { getEnv } from "@/lib/env";
import { id } from "@/lib/i18n/id";
import { DEVICE_STATUSES, statusColor, statusLabel } from "@/lib/status";
import { sumSummaries } from "@/lib/summary";
import { listZoneDevices } from "@/server/devices";
import { tokenCoversZones, verifyExportToken } from "@/server/export/token";
import { listSourcesForZone } from "@/server/network-sources";
import { listZoneBoundaries, listZoneSummaries } from "@/server/zones";

const EMPTY_COUNTS = {
  not_installed: 0,
  partial: 0,
  installed_untested: 0,
  tested: 0,
};

/**
 * Internal page for the PDF export: cover, then per zone a map page and a
 * device-table section, all in one HTML document with `break-after: page`.
 * Content is a fixed 277 mm wide (A4 landscape minus margins) so the screen
 * layout the maps are measured in equals the print layout. Requires a signed
 * export token covering every requested zone.
 */
export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: Promise<{ zones?: string; token?: string }>;
}) {
  const { zones: zonesParam, token } = await searchParams;
  const zoneIds = [...new Set((zonesParam ?? "").split(",").filter(Boolean))];
  if (
    zoneIds.length === 0 ||
    !z.array(z.string().uuid()).safeParse(zoneIds).success
  ) {
    notFound();
  }
  const payload = verifyExportToken(token, getEnv().BETTER_AUTH_SECRET);
  if (!tokenCoversZones(payload, zoneIds)) notFound();

  const db = getDb();
  const [boundaries, summaries] = await Promise.all([
    listZoneBoundaries(db),
    listZoneSummaries(db),
  ]);
  // Both lists are ordered by name, so the report is too.
  const selected = boundaries.filter((b) => zoneIds.includes(b.id));
  if (selected.length !== zoneIds.length) notFound();

  const sections = await Promise.all(
    selected.map(async (zone) => {
      const [devices, sources] = await Promise.all([
        listZoneDevices(db, zone.id),
        listSourcesForZone(db, zone.id),
      ]);
      const summary = summaries.find((s) => s.id === zone.id) ?? {
        total: 0,
        routers: 0,
        counts: EMPTY_COUNTS,
      };
      return { zone, devices, sources, summary };
    }),
  );
  const combined = sumSummaries(sections.map((s) => s.summary));

  return (
    <main className="bg-background w-[277mm]" data-testid="print-report">
      <MapReadyGate maps={sections.length} />

      <section className="break-after-page" data-testid="report-cover">
        <h1 className="text-3xl font-bold">{id.export.reportTitle}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {id.export.printedAt}: {formatWib(new Date())}
        </p>

        <h2 className="mt-8 text-lg font-semibold">
          {id.export.zonesIncluded}
        </h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {sections.map(({ zone, summary }) => (
            <li key={zone.id}>
              {zone.name}{" "}
              <span className="text-muted-foreground">
                ({summary.total} {id.summary.total.toLowerCase()})
              </span>
            </li>
          ))}
        </ul>

        <h2 className="mt-8 text-lg font-semibold">
          {id.export.combinedSummary}
        </h2>
        <dl className="mt-2 grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm">
          <dt>{id.summary.total}</dt>
          <dd className="font-semibold tabular-nums" data-testid="cover-total">
            {combined.total}
          </dd>
          <dt>{id.summary.routers}</dt>
          <dd className="font-semibold tabular-nums">{combined.routers}</dd>
          {DEVICE_STATUSES.map((s) => (
            <div key={s} className="contents" data-status={s}>
              <dt className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-3 rounded-full"
                  style={{ backgroundColor: statusColor[s] }}
                />
                {statusLabel[s]}
              </dt>
              <dd className="font-semibold tabular-nums">
                {combined.counts[s]}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {sections.map(({ zone, devices, sources, summary }, i) => {
        const sourceNames = new Map(sources.map((s) => [s.id, s.name]));
        const last = i === sections.length - 1;
        return (
          <div key={zone.id} data-testid="report-zone">
            <section className="break-after-page">
              <h2 className="mb-2 text-xl font-semibold">{zone.name}</h2>
              <div className="h-[165mm] w-[277mm]">
                <PrintZoneMap
                  mapKey={zone.id}
                  zone={{ name: zone.name, boundary: zone.boundary }}
                  devices={devices}
                  sources={sources}
                  summary={summary}
                />
              </div>
            </section>
            <section className={last ? "" : "break-after-page"}>
              <h2 className="mb-2 text-xl font-semibold">
                {zone.name} — {id.export.devicesTable}
              </h2>
              {devices.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {id.export.noDevicesInZone}
                </p>
              ) : (
                <DeviceTable devices={devices} sourceNames={sourceNames} />
              )}
            </section>
          </div>
        );
      })}
    </main>
  );
}
