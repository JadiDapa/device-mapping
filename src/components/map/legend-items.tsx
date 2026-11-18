import { NetworkIcon } from "lucide-react";
import { RouterBadgeIcon } from "@/lib/device-icons";
import { id } from "@/lib/i18n/id";
import { DEVICE_STATUSES, statusColor, statusLabel } from "@/lib/status";

/**
 * The legend rows themselves (4 statuses, router icon, network source,
 * connection line). Presentational and store-free so the print pages reuse it.
 */
export function LegendItems({
  connections = true,
}: {
  /** Hide the connection-line row where lines are not drawn (print). */
  connections?: boolean;
}) {
  return (
    <ul className="space-y-1.5 px-3 py-2 text-xs">
      {DEVICE_STATUSES.map((s) => (
        <li key={s} className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: statusColor[s] }}
          />
          {statusLabel[s]}
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span className="bg-muted flex size-4 shrink-0 items-center justify-center rounded-full">
          <RouterBadgeIcon className="size-3" aria-hidden />
        </span>
        {id.legend.router}
      </li>
      <li className="flex items-center gap-2">
        <span className="legend-source flex size-4 shrink-0 items-center justify-center rounded-[4px]">
          <NetworkIcon className="size-3" aria-hidden />
        </span>
        {id.legend.source}
      </li>
      {connections && (
        <li className="flex items-center gap-2">
          <svg
            aria-hidden
            viewBox="0 0 16 4"
            className="h-1 w-4 shrink-0 overflow-visible"
          >
            <line x1="0" y1="2" x2="16" y2="2" className="connection-line" />
          </svg>
          {id.legend.connection}
        </li>
      )}
    </ul>
  );
}
