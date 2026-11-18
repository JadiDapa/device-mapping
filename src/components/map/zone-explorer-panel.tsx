"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from "lucide-react";
import { SeqBadge } from "@/components/devices/seq-badge";
import { StatusBadge } from "@/components/devices/status-badge";
import { StatusProgress } from "@/components/zones/status-progress";
import { Button } from "@/components/ui/button";
import { id } from "@/lib/i18n/id";
import { testedPercent } from "@/lib/summary";
import type { ZoneSummary } from "@/server/zones";
import type { MarkerDevice } from "./device-marker";

type Props = {
  zones: ZoneSummary[];
  selectedId: string | null;
  devices: MarkerDevice[];
  isAdmin: boolean;
  hasBoundary: boolean;
  onSelectZone: (zoneId: string) => void;
  onBack: () => void;
  onFocusDevice: (deviceId: string) => void;
};

/**
 * Overlay panel for the root map: zone list (overview) or the selected zone's
 * summary + device list. Sits bottom-sheet style on mobile, left card on md+.
 */
export function ZoneExplorerPanel({
  zones,
  selectedId,
  devices,
  isAdmin,
  hasBoundary,
  onSelectZone,
  onBack,
  onFocusDevice,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const zone = zones.find((z) => z.id === selectedId) ?? null;

  return (
    <aside
      aria-label={id.allMap.panelLabel}
      data-testid="zone-explorer-panel"
      className="bg-card text-card-foreground pointer-events-auto absolute inset-x-0 bottom-0 z-[1000] flex max-h-[45dvh] flex-col overflow-hidden rounded-t-xl border shadow-lg md:inset-x-auto md:top-3 md:bottom-3 md:left-16 md:max-h-none md:w-[22rem] md:rounded-xl"
    >
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <div>
          <h2 className="text-lg font-semibold">{id.dashboard.title}</h2>
          {!collapsed && (
            <p className="text-muted-foreground text-xs">
              {id.allMap.pickHint}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && !collapsed && (
            <Button asChild size="sm">
              <Link href="/zones/new">
                <PlusIcon />
                {id.dashboard.newZone}
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-expanded={!collapsed}
            aria-label={
              collapsed ? id.allMap.expandPanel : id.allMap.collapsePanel
            }
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
        </div>
      </div>
      <div hidden={collapsed} className="min-h-0 flex-1 overflow-y-auto p-2">
        {zones.length === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            {isAdmin ? id.dashboard.emptyAdmin : id.dashboard.empty}
          </p>
        ) : (
          <ul className="space-y-1">
            {zones.map((z) => {
              const open = z.id === selectedId;
              return (
                <li
                  key={z.id}
                  className={open ? "bg-accent/40 rounded-md" : ""}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => (open ? onBack() : onSelectZone(z.id))}
                    className="hover:bg-accent focus-visible:outline-ring flex w-full items-center gap-2 rounded-md px-3 py-2 text-left focus-visible:outline-2"
                  >
                    <ChevronDownIcon
                      aria-hidden
                      className={`text-muted-foreground size-4 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {z.name}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {z.total} · {testedPercent(z.counts, z.total)}%
                    </span>
                  </button>
                  {open && zone && (
                    <div className="space-y-3 px-3 pt-1 pb-3">
                      <p className="text-muted-foreground text-sm">
                        {zone.description ?? id.dashboard.noDescription}
                      </p>
                      <dl className="grid grid-cols-3 gap-2 text-sm">
                        <Stat
                          label={id.dashboard.totalDevices}
                          value={zone.total}
                        />
                        <Stat
                          label={id.dashboard.routers}
                          value={zone.routers}
                        />
                        <Stat
                          label={id.dashboard.testedPercent}
                          value={`${testedPercent(zone.counts, zone.total)}%`}
                        />
                      </dl>
                      <StatusProgress counts={zone.counts} total={zone.total} />
                      {!hasBoundary && (
                        <p className="text-muted-foreground text-xs">
                          {id.allMap.noBoundary}
                        </p>
                      )}
                      <Button asChild className="w-full">
                        <Link href={`/zones/${zone.id}`}>
                          {id.allMap.openZone}
                        </Link>
                      </Button>
                      <h3 className="text-muted-foreground pt-1 text-xs font-medium">
                        {id.allMap.devicesInZone}
                      </h3>
                      {devices.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          {id.allMap.noDevicesInZone}
                        </p>
                      ) : (
                        <ul className="space-y-0.5">
                          {devices.map((d) => (
                            <li key={d.id}>
                              <button
                                type="button"
                                onClick={() => onFocusDevice(d.id)}
                                className="hover:bg-accent focus-visible:outline-ring flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm focus-visible:outline-2"
                              >
                                <SeqBadge seq={d.seq} status={d.status} />
                                <span className="min-w-0 flex-1 truncate">
                                  {d.locationDetail ?? "—"}
                                </span>
                                <StatusBadge status={d.status} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
