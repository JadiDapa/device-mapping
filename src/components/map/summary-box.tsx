"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
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
  // Below sm the box is a compact chip (total only) that expands on tap.
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-label={id.summary.title}
      data-testid="summary-box"
      className="bg-card/95 text-card-foreground pointer-events-auto rounded-lg border text-xs shadow-md backdrop-blur max-sm:w-44 sm:w-56"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-sm font-medium sm:hidden"
      >
        <span>
          {id.summary.total} <span className="tabular-nums">{total}</span>
        </span>
        {open ? (
          <ChevronDownIcon className="size-4" />
        ) : (
          <ChevronUpIcon className="size-4" />
        )}
      </button>
      <div
        className={
          open
            ? "block space-y-2 p-3 max-sm:border-t"
            : "hidden space-y-2 p-3 sm:block"
        }
      >
        <h2 className="hidden truncate text-sm font-semibold sm:block">
          {name}
        </h2>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
          <dt>{id.summary.total}</dt>
          <dd className="font-medium tabular-nums" data-testid="summary-total">
            {total}
          </dd>
          <dt>{id.summary.routers}</dt>
          <dd
            className="font-medium tabular-nums"
            data-testid="summary-routers"
          >
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
      </div>
    </section>
  );
}
