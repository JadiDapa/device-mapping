"use client";

import { SearchIcon } from "lucide-react";
import { useMapStore } from "@/components/map/map-store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { getDeviceIcon } from "@/lib/device-icons";
import { hasActiveFilter } from "@/lib/device-filter";
import { id } from "@/lib/i18n/id";
import {
  DEVICE_STATUSES,
  statusColor,
  statusLabel,
  type DeviceStatus,
} from "@/lib/status";
import { cn } from "@/lib/utils";

type TypeChip = { id: string; name: string; icon: string };

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring/50 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs outline-none focus-visible:ring-[3px]",
        pressed
          ? "border-foreground bg-accent font-medium"
          : "hover:bg-accent/60",
      )}
    >
      {children}
    </button>
  );
}

/** Status / type multi-filters, router-only and text search (PRD F4). */
export function DeviceFilters({ types }: { types: TypeChip[] }) {
  const filters = useMapStore((s) => s.filters);
  const setFilters = useMapStore((s) => s.setFilters);
  const resetFilters = useMapStore((s) => s.resetFilters);

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        />
        <Input
          type="search"
          value={filters.query}
          onChange={(e) => setFilters({ query: e.target.value })}
          placeholder={id.sidebar.search}
          aria-label={id.sidebar.search}
          className="pl-8"
        />
      </div>

      <div
        role="group"
        aria-label={id.sidebar.filterStatus}
        className="flex flex-wrap gap-1.5"
      >
        {DEVICE_STATUSES.map((s: DeviceStatus) => (
          <Chip
            key={s}
            pressed={filters.statuses.includes(s)}
            onClick={() =>
              setFilters({ statuses: toggle(filters.statuses, s) })
            }
          >
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: statusColor[s] }}
            />
            {statusLabel[s]}
          </Chip>
        ))}
      </div>

      {types.length > 0 && (
        <div
          role="group"
          aria-label={id.sidebar.filterType}
          className="flex flex-wrap gap-1.5"
        >
          {types.map((t) => {
            const Icon = getDeviceIcon(t.icon);
            return (
              <Chip
                key={t.id}
                pressed={filters.typeIds.includes(t.id)}
                onClick={() =>
                  setFilters({ typeIds: toggle(filters.typeIds, t.id) })
                }
              >
                <Icon className="size-3.5" aria-hidden />
                {t.name}
              </Chip>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor="filter-router-only"
          className="flex min-h-8 items-center gap-2 text-sm"
        >
          <Checkbox
            id="filter-router-only"
            checked={filters.routerOnly}
            onCheckedChange={(v) => setFilters({ routerOnly: v === true })}
          />
          {id.sidebar.routerOnly}
        </label>
        {hasActiveFilter(filters) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
          >
            {id.sidebar.resetFilters}
          </Button>
        )}
      </div>
    </div>
  );
}
