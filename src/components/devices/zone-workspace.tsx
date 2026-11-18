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
import { ExportPngButton } from "@/components/export/export-png-button";
import { ZoneMap } from "@/components/map";
import { Legend } from "@/components/map/legend";
import { MapToolbar } from "@/components/map/map-toolbar";
import { useMapStore } from "@/components/map/map-store";
import { SummaryBox } from "@/components/map/summary-box";
import {
  SourceDetail,
  type SourceDeviceItem,
} from "@/components/sources/source-detail";
import { SourceForm } from "@/components/sources/source-form";
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
import {
  deleteNetworkSourceAction,
  moveNetworkSourcePositionAction,
} from "@/server/actions/sources";
import type { ZoneDevice } from "@/server/devices";
import type { NetworkSource, SourceDevice } from "@/server/network-sources";
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
  /** Sources shown on this zone's map (own, zone-less, linked). */
  sources: NetworkSource[];
  /** Distinct source kinds, for the form's autocomplete. */
  sourceKinds: string[];
  /** Devices of OTHER zones connected to this zone's sources. */
  foreignSourceDevices: (SourceDevice & { networkSourceId: string })[];
  /** Device to select on arrival (`?device=` from the all-zones map). */
  initialDeviceId?: string | null;
  isAdmin: boolean;
};

type Op =
  | { type: "patch"; id: string; patch: Partial<ZoneDevice> }
  | { type: "reorder"; ids: string[] }
  | { type: "remove"; id: string };

type SourceOp =
  | { type: "patch"; id: string; patch: Partial<NetworkSource> }
  | { type: "remove"; id: string };

function reduceSources(state: NetworkSource[], op: SourceOp): NetworkSource[] {
  return op.type === "remove"
    ? state.filter((x) => x.id !== op.id)
    : state.map((x) => (x.id === op.id ? { ...x, ...op.patch } : x));
}

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
  sources,
  sourceKinds,
  foreignSourceDevices,
  initialDeviceId,
  isAdmin,
}: Props) {
  const [optimistic, apply] = useOptimistic(devices, reduce);
  const [optimisticSources, applySource] = useOptimistic(
    sources,
    reduceSources,
  );
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [sourceDraft, setSourceDraft] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [editingSource, setEditingSource] = useState(false);

  const mode = useMapStore((s) => s.mode);
  const setMode = useMapStore((s) => s.setMode);
  const selectedId = useMapStore((s) => s.selectedId);
  const select = useMapStore((s) => s.select);
  const selectedSourceId = useMapStore((s) => s.selectedSourceId);
  const selectSource = useMapStore((s) => s.selectSource);
  const filters = useMapStore((s) => s.filters);

  // Per-zone UI state resets on entering a zone; the persisted display
  // toggles are restored after mount so SSR and first paint agree.
  useEffect(() => {
    useMapStore.getState().resetZoneState();
    void useMapStore.persist.rehydrate();
    setDraft(null);
    setSourceDraft(null);
    setEditingSource(false);
    if (initialDeviceId && devices.some((d) => d.id === initialDeviceId)) {
      useMapStore.getState().select(initialDeviceId, { fly: true });
    }
    // Only entering a zone (or arriving via ?device=) should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone.id, initialDeviceId]);

  // Add mode needs at least one device type to pick from.
  useEffect(() => {
    if (mode === "addDevice" && types.length === 0) {
      toast.error(id.device.noTypes);
      setMode("idle");
    }
  }, [mode, types.length, setMode]);

  useEffect(() => {
    if (mode !== "addDevice" && mode !== "addSource") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode("idle");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, setMode]);

  const selected = optimistic.find((d) => d.id === selectedId) ?? null;
  const selectedSource =
    optimisticSources.find((x) => x.id === selectedSourceId) ?? null;
  const zoneNames = useMemo(
    () =>
      new Map([
        [zone.id, zone.name],
        ...otherZones.map((z) => [z.id, z.name] as const),
      ]),
    [zone.id, zone.name, otherZones],
  );
  const sourceOptions = useMemo(
    () =>
      optimisticSources.map((x) => ({
        id: x.id,
        name: x.name,
        kind: x.kind,
        zoneId: x.zoneId,
      })),
    [optimisticSources],
  );
  const markerSources = useMemo(
    () =>
      optimisticSources.map((x) => ({
        id: x.id,
        name: x.name,
        lat: x.lat,
        lng: x.lng,
      })),
    [optimisticSources],
  );
  const selectedSourceDevices = useMemo<SourceDeviceItem[]>(() => {
    if (!selectedSource) return [];
    const own = optimistic
      .filter((d) => d.networkSourceId === selectedSource.id)
      .map((d) => ({
        id: d.id,
        seq: d.seq,
        zoneId: d.zoneId,
        zoneName: zone.name,
        typeName: d.typeName,
        status: d.status,
        locationDetail: d.locationDetail,
      }));
    const foreign = foreignSourceDevices.filter(
      (d) => d.networkSourceId === selectedSource.id,
    );
    return [...own, ...foreign];
  }, [selectedSource, optimistic, foreignSourceDevices, zone.name]);
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
        networkSourceId: d.networkSourceId,
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
      setSourceDraft(null);
      setEditingSource(false);
      select(deviceId);
    },
    [select],
  );

  const onSelectSourceMarker = useCallback(
    (sourceId: string) => {
      setDraft(null);
      setSourceDraft(null);
      setEditingSource(false);
      selectSource(sourceId);
    },
    [selectSource],
  );

  const onSourceMoved = useCallback(
    (sourceId: string, lat: number, lng: number) => {
      startTransition(async () => {
        applySource({ type: "patch", id: sourceId, patch: { lat, lng } });
        const res = await moveNetworkSourcePositionAction(sourceId, {
          lat,
          lng,
        });
        if (!res.ok) toast.error(res.error);
        else toast.success(id.source.moved);
      });
    },
    [applySource],
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
      const adding = useMapStore.getState().mode;
      select(null);
      selectSource(null);
      setMode("idle");
      setEditingSource(false);
      if (adding === "addSource") {
        // A source may sit between zones: no out-of-zone warning.
        setDraft(null);
        setSourceDraft(pos);
      } else {
        warnIfOutside(pos);
        setSourceDraft(null);
        setDraft(pos);
      }
    },
    [select, selectSource, setMode, warnIfOutside],
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
            networkSourceId: input.networkSourceId,
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

  function onDeleteSource(sourceId: string) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        selectSource(null);
        setEditingSource(false);
        applySource({ type: "remove", id: sourceId });
        const res = await deleteNetworkSourceAction(sourceId);
        if (!res.ok) toast.error(res.error);
        else toast.success(id.source.deleted);
        resolve();
      });
    });
  }

  const nextSeq = optimistic.length + 1;
  const adding = mode === "addDevice" || mode === "addSource";
  const zoneChoices = [{ id: zone.id, name: zone.name }, ...otherZones];

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
        <div className="flex shrink-0 items-center gap-2">
          <ExportPngButton zoneId={zone.id} zoneName={zone.name} />
          {isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/zones/${zone.id}/edit`}>
                <PencilIcon />
                {id.common.edit}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative h-[60vh] min-h-80 md:h-auto md:flex-1">
          <ZoneMap
            boundary={zone.boundary}
            center={zone.center}
            zoom={zone.zoom}
            devices={markerDevices}
            sources={markerSources}
            draft={draft ? { ...draft, seq: nextSeq } : null}
            sourceDraft={sourceDraft}
            canEdit={isAdmin}
            onSelect={onSelectMarker}
            onMoved={onMoved}
            onSelectSource={onSelectSourceMarker}
            onSourceMoved={onSourceMoved}
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
                <span role="status">
                  {mode === "addSource" ? id.source.addHint : id.device.addHint}
                </span>
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
          {sourceDraft || (editingSource && selectedSource) ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {sourceDraft ? (
                <SourceForm
                  key={`new:${sourceDraft.lat}:${sourceDraft.lng}`}
                  initial={{
                    name: "",
                    kind: "",
                    description: "",
                    zoneId: zone.id,
                    ...sourceDraft,
                  }}
                  zones={zoneChoices}
                  kinds={sourceKinds}
                  onSaved={(source) => {
                    setSourceDraft(null);
                    selectSource(source.id);
                  }}
                  onCancel={() => setSourceDraft(null)}
                />
              ) : (
                selectedSource && (
                  <SourceForm
                    key={`edit:${selectedSource.id}:${selectedSource.updatedAt.getTime()}`}
                    sourceId={selectedSource.id}
                    initial={{
                      name: selectedSource.name,
                      kind: selectedSource.kind,
                      description: selectedSource.description,
                      zoneId: selectedSource.zoneId,
                      lat: selectedSource.lat,
                      lng: selectedSource.lng,
                    }}
                    zones={zoneChoices}
                    kinds={sourceKinds}
                    onSaved={() => setEditingSource(false)}
                    onCancel={() => setEditingSource(false)}
                  />
                )
              )}
            </div>
          ) : selectedSource ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SourceDetail
                source={{
                  ...selectedSource,
                  zoneName: selectedSource.zoneId
                    ? (zoneNames.get(selectedSource.zoneId) ?? null)
                    : null,
                }}
                devices={selectedSourceDevices}
                currentZoneId={zone.id}
                isAdmin={isAdmin}
                onBack={() => selectSource(null)}
                onSelectDevice={(deviceId) => select(deviceId, { fly: true })}
                onEdit={() => setEditingSource(true)}
                onDelete={() => onDeleteSource(selectedSource.id)}
              />
            </div>
          ) : draft ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DeviceForm
                // Re-mount when a new point is picked.
                key={`${draft.lat}:${draft.lng}`}
                zoneId={zone.id}
                position={draft}
                nextSeq={nextSeq}
                types={types}
                sources={sourceOptions}
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
                sources={sourceOptions}
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
              onAddSource={() => setMode("addSource")}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
