import { statusColor, type DeviceStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * Numbered circle in the device's status colour (same look as the map
 * marker). Decorative: the number and the status label are always shown as
 * text next to it.
 */
export function SeqBadge({
  seq,
  status,
  className,
}: {
  seq: number;
  status: DeviceStatus;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("seq-badge", className)}
      style={{ "--marker-color": statusColor[status] } as React.CSSProperties}
    >
      {seq}
    </span>
  );
}
