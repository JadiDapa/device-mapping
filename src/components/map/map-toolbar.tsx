"use client";

import { MapPinPlusIcon, XIcon } from "lucide-react";
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
        "bg-card/95 text-card-foreground focus-visible:ring-ring/50 pointer-events-auto min-h-9 rounded-md border px-3 text-xs shadow-md outline-none focus-visible:ring-[3px]",
        pressed && "border-foreground font-semibold",
      )}
    >
      {children}
    </button>
  );
}

/** Add-device button (admin) and the persisted display toggles (PRD F4). */
export function MapToolbar({ canEdit }: { canEdit: boolean }) {
  const mode = useMapStore((s) => s.mode);
  const setMode = useMapStore((s) => s.setMode);
  const showLocation = useMapStore((s) => s.showLocation);
  const showTypeIcon = useMapStore((s) => s.showTypeIcon);
  const setShowLocation = useMapStore((s) => s.setShowLocation);
  const setShowTypeIcon = useMapStore((s) => s.setShowTypeIcon);
  const adding = mode === "addDevice";

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
    </div>
  );
}
