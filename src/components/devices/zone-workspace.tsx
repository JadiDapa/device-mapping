"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { ZoneMap } from "@/components/map";
import { Legend } from "@/components/map/legend";
import { MapToolbar } from "@/components/map/map-toolbar";
import { useMapStore } from "@/components/map/map-store";
import { SummaryBox } from "@/components/map/summary-box";
import { Button } from "@/components/ui/button";
import type { GeoJsonPolygon } from "@/db/schema";
import { filterDevices } from "@/lib/device-filter";
import { isPointInZone } from "@/lib/geo";
import { id } from "@/lib/i18n/id";
import type { DeviceStatus } from "@/lib/status";
import type {
  DeviceStatusInput,
  DeviceUpdateInput,
} from "@/lib/validators/device";
import {
  deleteDeviceAction,
  moveDevicePositionAction,
  moveDeviceZoneAction,
  reorderDevicesAction,
  setDeviceStatusAction,
  updateDeviceAction,
} from "@/server/actions/devices";
import type { ZoneDevice } from "@/server/devices";
import { DeviceDetail } from "./device-detail";
import { DeviceForm } from "./device-form";
import { DeviceSidebar } from "./device-sidebar";

type Props = {
  zone: {
    id: string;
    name: string;
    description: string | null;
    boundary: GeoJsonPolygon | null;
    center: { lat: number; lng: number } | null;
    zoom: number | null;
  };
  devices: ZoneDevice[];
  types: { id: string; name: string; icon: string }[];
  summary: {
    total: number;
    routers: number;
    counts: Record<DeviceStatus, number>;
  };
  otherZones: { id: string; name: string }[];
  isAdmin: boolean;
};

type Op =
  | { type: "patch"; id: string; patch: Partial<ZoneDevice> }
  | { type: "reorder"; ids: string[] }
  | { type: "remove"; id: string };

/** Optimistic view of the zone's devices while a Server Action is running. */
function reduce(state: ZoneDevice[], op: Op): ZoneDevice[] {
  switch (op.type) {
    case "patch":
      return state.map((d) => (d.id === op.id ? { ...d, ...op.patch } : d));
    case "reorder": {
      const byId = new Map(state.map((d) => [d.id, d]));
      return op.ids.flatMap((deviceId, i) => {
        const d = byId.get(deviceId);
        return d ? [{ ...d, seq: i + 1 }] : [];
      });
    }
    case "remove":
      return state
        .filter((d) => d.id !== op.id)
        .map((d, i) => ({ ...d, seq: i + 1 }));
  }
}

export function ZoneWorkspace({
  zone,
  devices,
  types,
  summary,
  otherZones,
  isAdmin,
}: Props) {
  const [optimistic, apply] = useOptimistic(devices, reduce);
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);

  const mode = useMapStore((s) => s.mode);
  const setMode = useMapStore((s) => s.setMode);
  const selectedId = useMapStore((s) => s.selectedId);
  const select = useMapStore((s) => s.select);
  const filters = useMapStore((s) => s.filters);

  // Per-zone UI state resets on entering a zone; the persisted display
  // toggles are restored after mount so SSR and first paint agree.
  useEffect(() => {
    useMapStore.getState().resetZoneState();
    void useMapStore.persist.rehydrate();
    setDraft(null);
  }, [zone.id]);

  // Add mode needs at least one device type to pick from.
  useEffect(() => {
    if (mode === "addDevice" && types.length === 0) {
      toast.error(id.device.noTypes);
      setMode("idle");
    }
  }, [mode, types.length, setMode]);

  useEffect(() => {
    if (mode !== "addDevice") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode("idle");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, setMode]);

  const selected = optimistic.find((d) => d.id === selectedId) ?? null;
  const visible = useMemo(
    () => filterDevices(optimistic, filters),
    [optimistic, filters],
  );
  const markerDevices = useMemo(
    () =>
      visible.map((d) => ({
        id: d.id,
        seq: d.seq,
        status: d.status,
        isRouter: d.isRouter,
        lat: d.lat,
        lng: d.lng,
        locationDetail: d.locationDetail,
        typeIcon: d.typeIcon,
      })),
    [visible],
  );

  const warnIfOutside = useCallback(
    (pos: { lat: number; lng: number }) => {
      if (!isPointInZone(pos, zone.boundary)) {
        toast.warning(id.device.outsideZone);
      }
    },
    [zone.boundary],
  );

  const onSelectMarker = useCallback(
    (deviceId: string) => {
      setDraft(null);
      select(deviceId);
    },
    [select],
  );

  const onSelectFromList = useCallback(
    (deviceId: string) => select(deviceId, { fly: true }),
    [select],
  );

  const onMoved = useCallback(
    (deviceId: string, lat: number, lng: number) => {
      warnIfOutside({ lat, lng });
      startTransition(async () => {
        apply({ type: "patch", id: deviceId, patch: { lat, lng } });
        const res = await moveDevicePositionAction(deviceId, { lat, lng });
        if (!res.ok) toast.error(res.error);
        else toast.success(id.device.moved);
      });
    },
    [apply, warnIfOutside],
  );

  const onPick = useCallback(
    (pos: { lat: number; lng: number }) => {
      warnIfOutside(pos);
      select(null);
      setMode("idle");
      setDraft(pos);
    },
    [select, setMode, warnIfOutside],
  );

  function onReorder(orderedIds: string[]) {
    startTransition(async () => {
      apply({ type: "reorder", ids: orderedIds });
      const res = await reorderDevicesAction({
        zoneId: zone.id,
        ids: orderedIds,
      });
      if (!res.ok) toast.error(res.error);
      else toast.success(id.device.reordered);
    });
  }

  function onApplyStatus(deviceId: string, input: DeviceStatusInput) {
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        apply({
          type: "patch",
          id: deviceId,
          patch: {
            status: input.status,
            hasPower: input.hasPower,
            hasFo: input.hasFo,
            hasEthernet: input.hasEthernet,
            partialNote: input.partialNote,
          },
        });
        const res = await setDeviceStatusAction(deviceId, input);
        if (!res.ok) {
          toast.error(res.error);
          resolve(false);
          return;
        }
        if (res.data.staleWrite) toast.warning(id.device.staleWrite);
        else toast.success(id.device.statusChanged);
        resolve(true);
      });
    });
  }

  function onSaveDetail(deviceId: string, input: DeviceUpdateInput) {
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const type = types.find((t) => t.id === input.deviceTypeId);
        apply({
          type: "patch",
          id: deviceId,
          patch: {
            deviceTypeId: input.deviceTypeId,
            isRouter: input.isRouter,
            locationDetail: input.locationDetail,
            notes: input.notes,
            ...(type ? { typeName: type.name, typeIcon: type.icon } : {}),
          },
        });
        const res = await updateDeviceAction(deviceId, input);
        if (!res.ok) {
          toast.error(res.error);
          resolve(false);
          return;
        }
        if (res.data.staleWrite) toast.warning(id.device.staleWrite);
        else toast.success(id.device.updated);
        resolve(true);
      });
    });
  }

  function onDelete(deviceId: string) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        select(null);
        apply({ type: "remove", id: deviceId });
        const res = await deleteDeviceAction(deviceId);
        if (!res.ok) toast.error(res.error);
        else toast.success(id.device.deleted);
        resolve();
      });
    });
  }

  function onMoveZone(deviceId: string, zoneId: string) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await moveDeviceZoneAction(deviceId, { zoneId });
        if (!res.ok) {
          toast.error(res.error);
        } else {
          select(null);
          apply({ type: "remove", id: deviceId });
          toast.success(id.device.movedZone);
        }
        resolve();
      });
    });
  }

  const nextSeq = optimistic.length + 1;
  const adding = mode === "addDevice";

  return (
    <div className="flex flex-col md:h-[calc(100dvh-3.5rem)]">
      <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{zone.name}</h1>
          {zone.description && (
            <p className="text-muted-foreground truncate text-sm">
              {zone.description}
            </p>
          )}
          {!zone.boundary && (
            <p className="text-muted-foreground text-xs">
              {id.zone.noBoundary}
            </p>
          )}
        </div>
        {isAdmin && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/zones/${zone.id}/edit`}>
              <PencilIcon />
              {id.common.edit}
            </Link>
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative h-[60vh] min-h-80 md:h-auto md:flex-1">
          <ZoneMap
            boundary={zone.boundary}
            center={zone.center}
            zoom={zone.zoom}
            devices={markerDevices}
            draft={draft ? { ...draft, seq: nextSeq } : null}
            canEdit={isAdmin}
            onSelect={onSelectMarker}
            onMoved={onMoved}
            onPick={onPick}
          />
          <div className="pointer-events-none absolute inset-0 z-[1000]">
            <div className="absolute top-3 right-3 left-14 sm:right-64">
              <MapToolbar canEdit={isAdmin} />
            </div>
            <div className="absolute top-14 right-3 sm:top-3">
              <SummaryBox
                name={zone.name}
                total={summary.total}
                routers={summary.routers}
                counts={summary.counts}
              />
            </div>
            <div className="absolute bottom-7 left-3">
              <Legend />
            </div>
            {adding && (
              <div className="bg-card text-card-foreground pointer-events-auto absolute right-3 bottom-7 left-3 mx-auto flex w-fit max-w-full items-center gap-2 rounded-md border py-1 pr-1 pl-3 text-sm shadow-md">
                <span role="status">{id.device.addHint}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-9"
                  onClick={() => setMode("idle")}
                >
                  {id.common.cancel}
                </Button>
              </div>
            )}
          </div>
        </div>

        <aside
          aria-label={id.sidebar.title}
          className="bg-background flex min-h-0 flex-col border-t md:w-96 md:border-t-0 md:border-l"
        >
          {draft ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DeviceForm
                // Re-mount when a new point is picked.
                key={`${draft.lat}:${draft.lng}`}
                zoneId={zone.id}
                position={draft}
                nextSeq={nextSeq}
                types={types}
                onCreated={(device) => {
                  setDraft(null);
                  select(device.id);
                }}
                onCancel={() => setDraft(null)}
              />
            </div>
          ) : selected ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DeviceDetail
                device={selected}
                types={types}
                otherZones={otherZones}
                isAdmin={isAdmin}
                onBack={() => select(null)}
                onApplyStatus={(input) => onApplyStatus(selected.id, input)}
                onSaveDetail={(input) => onSaveDetail(selected.id, input)}
                onMoveZone={(zoneId) => onMoveZone(selected.id, zoneId)}
                onDelete={() => onDelete(selected.id)}
              />
            </div>
          ) : (
            <DeviceSidebar
              devices={optimistic}
              types={types}
              isAdmin={isAdmin}
              onReorder={onReorder}
              onSelect={onSelectFromList}
              onAdd={() => setMode("addDevice")}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
