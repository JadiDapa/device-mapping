"use client";

import {
  DEVICE_STATUSES,
  statusColor,
  statusLabel,
  type DeviceStatus,
} from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * Four status buttons (segmented). Each shows a colour dot AND its label, so
 * the status is never colour-only. Touch targets are >= 44px on mobile.
 */
export function StatusSegmented({
  value,
  onChange,
  disabled,
  label,
}: {
  value: DeviceStatus;
  onChange: (status: DeviceStatus) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-cols-1 gap-1.5 sm:grid-cols-2"
    >
      {DEVICE_STATUSES.map((s) => {
        const selected = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={selected}
            data-status={s}
            disabled={disabled}
            onClick={() => onChange(s)}
            className={cn(
              "focus-visible:ring-ring/50 flex min-h-11 items-center gap-2 rounded-md border px-3 py-1.5 text-left text-sm outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-9",
              selected
                ? "border-foreground bg-accent font-medium"
                : "hover:bg-accent/60",
            )}
          >
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: statusColor[s] }}
            />
            {statusLabel[s]}
          </button>
        );
      })}
    </div>
  );
}
