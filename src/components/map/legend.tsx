"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { RouterBadgeIcon } from "@/lib/device-icons";
import { id } from "@/lib/i18n/id";
import { DEVICE_STATUSES, statusColor, statusLabel } from "@/lib/status";
import { useMapStore } from "./map-store";

/** Collapsible legend: the 4 statuses + router icon (PRD F4). */
export function Legend() {
  const open = useMapStore((s) => s.legendOpen);
  const setOpen = useMapStore((s) => s.setLegendOpen);

  return (
    <section
      aria-label={id.legend.title}
      className="bg-card/95 text-card-foreground pointer-events-auto w-56 rounded-lg border shadow-md backdrop-blur"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? id.legend.collapse : id.legend.expand}
        className="flex min-h-9 w-full items-center justify-between px-3 text-sm font-medium"
      >
        {id.legend.title}
        {open ? (
          <ChevronDownIcon className="size-4" />
        ) : (
          <ChevronUpIcon className="size-4" />
        )}
      </button>
      {open && (
        <ul className="space-y-1.5 border-t px-3 py-2 text-xs">
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
        </ul>
      )}
    </section>
  );
}
