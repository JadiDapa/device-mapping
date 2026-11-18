import { id } from "@/lib/i18n/id";
import {
  DEVICE_STATUSES,
  statusColor,
  statusLabel,
  type DeviceStatus,
} from "@/lib/status";

/**
 * Zone summary overlay (top-right). The numbers come from the DB GROUP BY
 * query (never computed or typed in), so they always match the devices.
 */
export function SummaryBox({
  name,
  total,
  routers,
  counts,
}: {
  name: string;
  total: number;
  routers: number;
  counts: Record<DeviceStatus, number>;
}) {
  return (
    <section
      aria-label={id.summary.title}
      data-testid="summary-box"
      className="bg-card/95 text-card-foreground pointer-events-auto w-56 space-y-2 rounded-lg border p-3 text-xs shadow-md backdrop-blur"
    >
      <h2 className="truncate text-sm font-semibold">{name}</h2>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        <dt>{id.summary.total}</dt>
        <dd className="font-medium tabular-nums" data-testid="summary-total">
          {total}
        </dd>
        <dt>{id.summary.routers}</dt>
        <dd className="font-medium tabular-nums" data-testid="summary-routers">
          {routers}
        </dd>
      </dl>
      <ul className="space-y-1 border-t pt-2">
        {DEVICE_STATUSES.map((s) => (
          <li key={s} data-status={s} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: statusColor[s] }}
            />
            <span className="min-w-0 flex-1 truncate">{statusLabel[s]}</span>
            <span className="font-medium tabular-nums">{counts[s]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
