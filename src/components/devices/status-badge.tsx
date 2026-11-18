import { Badge } from "@/components/ui/badge";
import { statusLabel, type DeviceStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

const dotClass: Record<DeviceStatus, string> = {
  not_installed: "bg-status-not-installed",
  partial: "bg-status-partial",
  installed_untested: "bg-status-installed-untested",
  tested: "bg-status-tested",
};

/**
 * Status badge: colour dot AND text label (status is never conveyed by colour
 * alone). The dot uses the status colour tokens; enum/label come from
 * lib/status.ts.
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
      className={cn("text-foreground bg-card gap-1.5", className)}
    >
      <span
        aria-hidden
        className={cn("size-2 shrink-0 rounded-full", dotClass[status])}
      />
      {statusLabel[status]}
    </Badge>
  );
}
