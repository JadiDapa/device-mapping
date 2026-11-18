import { PrintMap } from "@/components/map";
import { LegendItems } from "@/components/map/legend-items";
import { SummaryBox } from "@/components/map/summary-box";
import type { GeoJsonPolygon } from "@/db/schema";
import { id } from "@/lib/i18n/id";
import type { DeviceStatus } from "@/lib/status";
import type { ZoneDevice } from "@/server/devices";
import type { NetworkSource } from "@/server/network-sources";

type Props = {
  mapKey: string;
  zone: { name: string; boundary: GeoJsonPolygon | null };
  devices: ZoneDevice[];
  sources: NetworkSource[];
  summary: {
    total: number;
    routers: number;
    counts: Record<DeviceStatus, number>;
  };
};

/**
 * One zone's static map with its summary box and legend overlaid (the PNG
 * canvas and each zone's map page in the PDF). Fills its positioned parent.
 */
export function PrintZoneMap({
  mapKey,
  zone,
  devices,
  sources,
  summary,
}: Props) {
  return (
    <div className="relative size-full overflow-hidden">
      <PrintMap
        mapKey={mapKey}
        boundary={zone.boundary}
        devices={devices.map((d) => ({
          id: d.id,
          seq: d.seq,
          status: d.status,
          isRouter: d.isRouter,
          lat: d.lat,
          lng: d.lng,
          locationDetail: d.locationDetail,
          typeIcon: d.typeIcon,
        }))}
        sources={sources.map((s) => ({
          id: s.id,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
        }))}
      />
      <div className="pointer-events-none absolute inset-0 z-[1000]">
        <div className="absolute top-3 right-3">
          <SummaryBox
            name={zone.name}
            total={summary.total}
            routers={summary.routers}
            counts={summary.counts}
          />
        </div>
        <div className="absolute bottom-7 left-3">
          <section
            aria-label={id.legend.title}
            className="bg-card/95 text-card-foreground w-56 rounded-lg border shadow-md"
          >
            <h2 className="px-3 pt-2 text-sm font-medium">{id.legend.title}</h2>
            <LegendItems connections={false} />
          </section>
        </div>
      </div>
    </div>
  );
}
