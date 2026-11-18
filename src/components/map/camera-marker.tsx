"use client";

import { memo, useMemo } from "react";
import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import { imageUrl, type CameraPointView } from "@/components/camera/types";
import { fmt } from "@/lib/i18n/format";
import { id as t } from "@/lib/i18n/id";
import { buildCameraMarkerHtml } from "./marker-html";

const PREVIEW_COUNT = 4;

type Props = {
  point: CameraPointView;
  selected: boolean;
  draggable: boolean;
  /** Draft previews have no popover. */
  popup?: boolean;
  onSelect: (id: string) => void;
  onMoved: (id: string, lat: number, lng: number) => void;
  onOpenGallery: (pointId: string, index: number) => void;
};

function CameraMarkerImpl({
  point,
  selected,
  draggable,
  popup = true,
  onSelect,
  onMoved,
  onOpenGallery,
}: Props) {
  const count = point.images.length;
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "device-marker-icon",
        html: buildCameraMarkerHtml({ name: point.name, count, selected }),
        // Same pin geometry as DeviceMarker (tip ~44px below the box top).
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        // The popover opens above the pin head.
        popupAnchor: [0, -40],
      }),
    [point.name, count, selected],
  );
  const handlers = useMemo(
    () => ({
      click: () => onSelect(point.id),
      dragend: (e: L.LeafletEvent) => {
        const { lat, lng } = (e.target as L.Marker).getLatLng();
        onMoved(point.id, lat, lng);
      },
    }),
    [point.id, onSelect, onMoved],
  );
  const preview = point.images.slice(0, PREVIEW_COUNT);
  const extra = count - preview.length;

  return (
    <Marker
      position={[point.lat, point.lng]}
      icon={icon}
      draggable={draggable}
      eventHandlers={handlers}
      title={fmt(t.camera.markerTitle, { name: point.name, n: count })}
      zIndexOffset={selected ? 1000 : 100}
    >
      {popup && (
        <Popup
          closeButton={false}
          minWidth={200}
          maxWidth={300}
          className="camera-popup"
        >
          <div
            className="space-y-2"
            role="group"
            aria-label={t.camera.popoverLabel}
            data-testid="camera-popover"
          >
            <div>
              <p className="text-sm leading-tight font-semibold">
                {point.name}
              </p>
              <p className="text-muted-foreground text-xs">
                {fmt(t.camera.imageCount, { n: count })}
              </p>
            </div>
            {count === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t.camera.noImages}
              </p>
            ) : (
              <>
                <ul className="grid grid-cols-4 gap-1.5">
                  {preview.map((img, i) => (
                    <li key={img.id} className="relative">
                      <button
                        type="button"
                        onClick={() => onOpenGallery(point.id, i)}
                        aria-label={fmt(t.camera.openImage, { n: i + 1 })}
                        className="focus-visible:outline-ring block aspect-square w-full overflow-hidden rounded-md border outline-offset-2 focus-visible:outline-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- behind auth, served by our own route */}
                        <img
                          src={imageUrl(img.thumbKey)}
                          alt={img.caption ?? ""}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      </button>
                      {i === preview.length - 1 && extra > 0 && (
                        <span
                          aria-hidden
                          className="bg-foreground/70 text-background pointer-events-none absolute inset-0 flex items-center justify-center rounded-md text-xs font-semibold"
                        >
                          {fmt(t.camera.moreImages, { n: extra })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onOpenGallery(point.id, 0)}
                  className="bg-primary text-primary-foreground focus-visible:outline-ring min-h-9 w-full rounded-full px-3 text-xs font-medium outline-offset-2 focus-visible:outline-2"
                >
                  {t.camera.viewAll}
                </button>
              </>
            )}
          </div>
        </Popup>
      )}
    </Marker>
  );
}

export const CameraMarker = memo(CameraMarkerImpl, (a, b) => {
  const x = a.point;
  const y = b.point;
  return (
    x.id === y.id &&
    x.lat === y.lat &&
    x.lng === y.lng &&
    x.name === y.name &&
    x.images === y.images &&
    a.selected === b.selected &&
    a.draggable === b.draggable &&
    a.popup === b.popup &&
    a.onSelect === b.onSelect &&
    a.onMoved === b.onMoved &&
    a.onOpenGallery === b.onOpenGallery
  );
});
