"use client";

import { useMemo } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVerticalIcon,
  LocateFixedIcon,
  NetworkIcon,
  RadioTowerIcon,
  PlusIcon,
  CameraIcon,
} from "lucide-react";
import { useMapStore } from "@/components/map/map-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { filterDevices, hasActiveFilter } from "@/lib/device-filter";
import { getDeviceIcon, RouterBadgeIcon } from "@/lib/device-icons";
import { fmt } from "@/lib/i18n/format";
import { id } from "@/lib/i18n/id";
import { cn } from "@/lib/utils";
import type { ZoneDevice } from "@/server/devices";
import { DeviceFilters } from "./device-filters";
import { SeqBadge } from "./seq-badge";
import { StatusBadge } from "./status-badge";

type Props = {
  devices: ZoneDevice[];
  types: { id: string; name: string; icon: string }[];
  isAdmin: boolean;
  /** Full new order (every device in the zone) after a drag. */
  onReorder: (orderedIds: string[]) => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onAddSource: () => void;
  onAddExtender: () => void;
  onAddCamera: () => void;
  /** Add a device at the browser GPS position. */
  onAddHere: () => void;
};

export function DeviceSidebar({
  devices,
  types,
  isAdmin,
  onReorder,
  onSelect,
  onAdd,
  onAddSource,
  onAddExtender,
  onAddCamera,
  onAddHere,
}: Props) {
  const filters = useMapStore((s) => s.filters);
  const selectedId = useMapStore((s) => s.selectedId);
  const filtered = useMemo(
    () => filterDevices(devices, filters),
    [devices, filters],
  );
  const filtering = hasActiveFilter(filters);
  // A reordered subset has no unambiguous full order, so dragging waits for
  // the filter to be cleared.
  const canReorder = isAdmin && !filtering;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = devices.findIndex((d) => d.id === active.id);
    const to = devices.findIndex((d) => d.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(devices, from, to).map((d) => d.id));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 border-b p-3 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {id.sidebar.title}{" "}
            <span className="text-muted-foreground text-sm font-normal tabular-nums">
              (
              {filtering
                ? fmt(id.sidebar.count, {
                    shown: filtered.length,
                    total: devices.length,
                  })
                : devices.length}
              )
            </span>
          </h2>
          {isAdmin && (
            <div className="flex w-full items-center gap-2 md:hidden">
              <Button size="sm" className="min-h-11 flex-1" onClick={onAdd}>
                <PlusIcon />
                {id.device.add}
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="size-11"
                onClick={onAddHere}
                aria-label={id.geo.addAtMyLocation}
                title={id.geo.addAtMyLocation}
              >
                <LocateFixedIcon />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="size-11"
                onClick={onAddSource}
                aria-label={id.source.add}
                title={id.source.add}
              >
                <NetworkIcon />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="size-11"
                onClick={onAddExtender}
                aria-label={id.extender.add}
                title={id.extender.add}
              >
                <RadioTowerIcon />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="size-11"
                onClick={onAddCamera}
                aria-label={id.camera.add}
                title={id.camera.add}
              >
                <CameraIcon />
              </Button>
            </div>
          )}
        </div>
        <DeviceFilters types={types} />
        {isAdmin && filtering && (
          <p className="text-muted-foreground text-xs">
            {id.sidebar.reorderDisabled}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {devices.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
            {id.sidebar.empty}
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
            {id.sidebar.emptyFiltered}
          </p>
        ) : (
          <DndContext
            id="device-sortable"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={filtered.map((d) => d.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul data-testid="device-list" className="divide-y">
                {filtered.map((d) => (
                  <SortableRow
                    key={d.id}
                    device={d}
                    selected={d.id === selectedId}
                    draggable={canReorder}
                    onSelect={onSelect}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function SortableRow({
  device: d,
  selected,
  draggable,
  onSelect,
}: {
  device: ZoneDevice;
  selected: boolean;
  draggable: boolean;
  onSelect: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: d.id, disabled: !draggable });
  const Icon = getDeviceIcon(d.typeIcon);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="device-item"
      data-seq={d.seq}
      className={cn(
        "bg-background flex items-center gap-1 pr-2",
        selected && "bg-accent",
        isDragging && "relative z-10 shadow-lg",
      )}
    >
      {draggable && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          aria-label={id.device.dragHandle}
          title={id.device.dragHandle}
          className="text-muted-foreground hover:text-foreground flex min-h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onSelect(d.id)}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "hover:bg-accent/60 flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left",
          !draggable && "pl-4",
        )}
      >
        <SeqBadge seq={d.seq} status={d.status} />
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{d.typeName}</span>
            {d.isRouter && (
              <Badge variant="secondary" className="gap-1 px-1.5">
                <RouterBadgeIcon aria-hidden />
                {id.device.router}
              </Badge>
            )}
          </span>
          <span className="text-muted-foreground block truncate text-xs">
            {d.locationDetail ?? id.device.noLocation}
          </span>
          <StatusBadge status={d.status} />
        </span>
      </button>
    </li>
  );
}
