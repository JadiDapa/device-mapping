"use client";

import { useState } from "react";
import {
  CameraIcon,
  LocateFixedIcon,
  MapPinPlusIcon,
  MoveIcon,
  NetworkIcon,
  RadioTowerIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { id } from "@/lib/i18n/id";
import { cn } from "@/lib/utils";
import { useMapStore } from "./map-store";

function ToggleButton({
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
        "bg-card/95 text-card-foreground focus-visible:ring-ring/50 pointer-events-auto min-h-11 rounded-md border px-3 text-xs shadow-md outline-none focus-visible:ring-[3px] md:min-h-9",
        pressed && "border-foreground font-semibold",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Add buttons (admin) and the persisted display toggles (PRD F4). Below `md`
 * the toolbar is condensed: the add buttons live in the bottom sheet, the
 * three display toggles collapse behind one "Tampilan" button and admins get
 * a "Mode pindah" button (touch dragging is only enabled in that mode).
 */
export function MapToolbar({
  canEdit,
  onAddHere,
}: {
  canEdit: boolean;
  /** Add a device at the browser's GPS position. */
  onAddHere: () => void;
}) {
  const mode = useMapStore((s) => s.mode);
  const setMode = useMapStore((s) => s.setMode);
  const showLocation = useMapStore((s) => s.showLocation);
  const showTypeIcon = useMapStore((s) => s.showTypeIcon);
  const setShowLocation = useMapStore((s) => s.setShowLocation);
  const setShowTypeIcon = useMapStore((s) => s.setShowTypeIcon);
  const showConnections = useMapStore((s) => s.showConnections);
  const setShowConnections = useMapStore((s) => s.setShowConnections);
  const showCameras = useMapStore((s) => s.showCameras);
  const setShowCameras = useMapStore((s) => s.setShowCameras);
  const [displayOpen, setDisplayOpen] = useState(false);
  const adding = mode === "addDevice";
  const addingSource = mode === "addSource";
  const addingExtender = mode === "addExtender";
  const addingCamera = mode === "addCamera";
  const moving = mode === "move";

  return (
    <div className="pointer-events-none flex flex-wrap items-start gap-2">
      {canEdit && (
        <Button
          type="button"
          size="sm"
          variant={adding ? "secondary" : "default"}
          className="pointer-events-auto hidden min-h-9 shadow-md md:inline-flex"
          onClick={() => setMode(adding ? "idle" : "addDevice")}
        >
          {adding ? <XIcon /> : <MapPinPlusIcon />}
          {adding ? id.device.cancelAdd : id.device.add}
        </Button>
      )}
      {canEdit && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="pointer-events-auto hidden min-h-9 shadow-md md:inline-flex"
          onClick={onAddHere}
        >
          <LocateFixedIcon />
          {id.geo.addAtMyLocation}
        </Button>
      )}
      {canEdit && (
        <Button
          type="button"
          size="sm"
          variant={addingSource ? "secondary" : "outline"}
          className="pointer-events-auto hidden min-h-9 shadow-md md:inline-flex"
          onClick={() => setMode(addingSource ? "idle" : "addSource")}
        >
          {addingSource ? <XIcon /> : <NetworkIcon />}
          {addingSource ? id.source.cancelAdd : id.source.add}
        </Button>
      )}
      {canEdit && (
        <Button
          type="button"
          size="sm"
          variant={addingExtender ? "secondary" : "outline"}
          className="pointer-events-auto hidden min-h-9 shadow-md md:inline-flex"
          onClick={() => setMode(addingExtender ? "idle" : "addExtender")}
        >
          {addingExtender ? <XIcon /> : <RadioTowerIcon />}
          {addingExtender ? id.extender.cancelAdd : id.extender.add}
        </Button>
      )}
      {canEdit && (
        <Button
          type="button"
          size="sm"
          variant={addingCamera ? "secondary" : "outline"}
          className="pointer-events-auto hidden min-h-9 shadow-md md:inline-flex"
          onClick={() => setMode(addingCamera ? "idle" : "addCamera")}
        >
          {addingCamera ? <XIcon /> : <CameraIcon />}
          {addingCamera ? id.camera.cancelAdd : id.camera.add}
        </Button>
      )}
      {canEdit && (
        <Button
          type="button"
          size="sm"
          variant={moving ? "secondary" : "outline"}
          aria-pressed={moving}
          className="pointer-events-auto min-h-11 shadow-md md:hidden"
          onClick={() => setMode(moving ? "idle" : "move")}
        >
          <MoveIcon />
          {id.mobile.moveMode}
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-expanded={displayOpen}
        className="pointer-events-auto min-h-11 shadow-md md:hidden"
        onClick={() => setDisplayOpen((v) => !v)}
      >
        <SlidersHorizontalIcon />
        {id.mobile.display}
      </Button>
      <div
        className={cn(
          "flex-wrap items-start gap-2 max-md:flex-col",
          displayOpen ? "flex" : "hidden",
          "md:flex",
        )}
      >
        <ToggleButton
          pressed={showLocation}
          onClick={() => setShowLocation(!showLocation)}
        >
          {id.toggles.showLocation}
        </ToggleButton>
        <ToggleButton
          pressed={showTypeIcon}
          onClick={() => setShowTypeIcon(!showTypeIcon)}
        >
          {id.toggles.showTypeIcon}
        </ToggleButton>
        <ToggleButton
          pressed={showConnections}
          onClick={() => setShowConnections(!showConnections)}
        >
          {id.toggles.showConnections}
        </ToggleButton>
        <ToggleButton
          pressed={showCameras}
          onClick={() => setShowCameras(!showCameras)}
        >
          {id.camera.toggle}
        </ToggleButton>
      </div>
    </div>
  );
}
