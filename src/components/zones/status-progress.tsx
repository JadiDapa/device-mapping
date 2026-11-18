import { DEVICE_STATUSES, statusColor, statusLabel } from "@/lib/status";
import type { DeviceStatus } from "@/lib/status";
import { id } from "@/lib/i18n/id";

/**
 * Stacked progress bar, one segment per status. Colours come from
 * lib/status.ts. Status is never conveyed by colour alone: every status is
 * also listed below the bar with its label and count.
 */
export function StatusProgress({
  counts,
  total,
}: {
  counts: Record<DeviceStatus, number>;
  total: number;
}) {
  const summary = DEVICE_STATUSES.map(
    (s) => `${statusLabel[s]}: ${counts[s]}`,
  ).join(", ");

  return (
    <div className="space-y-2">
      <div
        role="img"
        aria-label={`${id.dashboard.progressLabel}. ${summary}`}
        className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full"
      >
        {total > 0 &&
          DEVICE_STATUSES.map((s) =>
            counts[s] > 0 ? (
              <div
                key={s}
                data-status={s}
                style={{
                  width: `${(counts[s] / total) * 100}%`,
                  backgroundColor: statusColor[s],
                }}
              />
            ) : null,
          )}
      </div>
      <ul className="text-muted-foreground grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {DEVICE_STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: statusColor[s] }}
            />
            <span className="truncate">{statusLabel[s]}</span>
            <span className="text-foreground ml-auto font-medium tabular-nums">
              {counts[s]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
