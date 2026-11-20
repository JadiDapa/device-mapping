"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { id } from "@/lib/i18n/id";
import { useIsDesktop } from "@/lib/use-media-query";
import { LegendItems } from "./legend-items";
import { useMapStore } from "./map-store";

/** Collapsible legend overlay (PRD F4). */
export function Legend() {
  const storeOpen = useMapStore((s) => s.legendOpen);
  const setStoreOpen = useMapStore((s) => s.setLegendOpen);
  // On phones the legend always starts collapsed (it would cover the map and
  // the tile attribution); the persisted choice only applies on desktop.
  const desktop = useIsDesktop();
  const [mobileOpen, setMobileOpen] = useState(false);
  const open = desktop ? storeOpen : mobileOpen;
  const setOpen = desktop ? setStoreOpen : setMobileOpen;

  return (
    <section
      aria-label={id.legend.title}
      className="bg-card/95 text-card-foreground pointer-events-auto w-44 rounded-lg border shadow-md backdrop-blur sm:w-56"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? id.legend.collapse : id.legend.expand}
        className="flex min-h-11 w-full items-center justify-between px-3 text-sm font-medium sm:min-h-9"
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
