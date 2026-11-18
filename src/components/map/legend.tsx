"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { id } from "@/lib/i18n/id";
import { LegendItems } from "./legend-items";
import { useMapStore } from "./map-store";

/** Collapsible legend overlay (PRD F4). */
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
        <div className="border-t">
          <LegendItems />
        </div>
      )}
    </section>
  );
}
