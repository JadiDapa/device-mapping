import { Badge } from "@/components/ui/badge";
import { statusColor, statusLabel, type DeviceStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * Status badge: colour dot AND text label (status is never conveyed by colour
 * alone). The colour comes from lib/status.ts.
 */
export function StatusBadge({
  status,
  className,
}: {
  status: DeviceStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      data-status={status}
      className={cn("gap-1.5", className)}
    >
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: statusColor[status] }}
      />
      {statusLabel[status]}
    </Badge>
  );
}
