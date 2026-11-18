"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmt } from "@/lib/i18n/format";
import { id as t } from "@/lib/i18n/id";
import { cn } from "@/lib/utils";
import { imageUrl, type CameraImageView, type CameraPointView } from "./types";

const SWIPE_PX = 50;

/** Main photo with a skeleton while it loads (remounted per image via key). */
function MainImage({ image }: { image: CameraImageView }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  return (
    <div className="relative flex size-full items-center justify-center">
      {state === "loading" && (
        <div
          className="absolute h-2/3 w-2/3 animate-pulse rounded-lg bg-white/10 motion-reduce:animate-none"
          aria-hidden
        />
      )}
      {state === "error" ? (
        <p className="text-sm text-white/80">{t.camera.loadFailed}</p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- behind auth, served by our own route
        <img
          src={imageUrl(image.displayKey)}
          alt={image.caption ?? ""}
          width={image.width}
          height={image.height}
          draggable={false}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
          className={cn(
            "max-h-full max-w-full object-contain select-none",
            state !== "ready" && "opacity-0",
          )}
        />
      )}
    </div>
  );
}

type Props = {
  point: CameraPointView | null;
  /** Index of the photo shown; the gallery is open while `point` is set. */
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

/**
 * Fullscreen photo viewer for one camera point: big photo with prev/next
 * (buttons, arrow keys, swipe), caption, and a thumbnail strip of every photo
 * of the point underneath.
 */
export function CameraGallery({ point, index, onIndexChange, onClose }: Props) {
  const images = point?.images ?? [];
  const total = images.length;
  const current = Math.min(Math.max(index, 0), Math.max(total - 1, 0));
  const image = images[current];
  const activeThumb = useRef<HTMLButtonElement>(null);
  const swipeStart = useRef<number | null>(null);

  const go = useCallback(
    (to: number) => {
      if (to < 0 || to > total - 1) return;
      onIndexChange(to);
    },
    [onIndexChange, total],
  );

  // Keep the active thumbnail visible in the strip.
  useEffect(() => {
    activeThumb.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [current, point?.id]);

  // Warm the cache for the neighbours.
  useEffect(() => {
    for (const i of [current - 1, current + 1]) {
      const img = images[i];
      if (img) new Image().src = imageUrl(img.displayKey);
    }
  }, [current, images]);

  // Nothing left to show (e.g. the last photo was deleted): close.
  useEffect(() => {
    if (point && total === 0) onClose();
  }, [point, total, onClose]);

  return (
    <Dialog
      open={Boolean(point) && total > 0}
      onOpenChange={(o) => !o && onClose()}
    >
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(current - 1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            go(current + 1);
          }
        }}
        className="top-0 left-0 grid h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-0 overflow-hidden rounded-none border-0 bg-black/95 p-0 text-white sm:max-w-none"
        data-testid="camera-gallery"
      >
        <DialogDescription className="sr-only">
          {t.camera.thumbnails}
        </DialogDescription>
        <header className="flex items-center gap-3 px-4 py-2">
          <DialogTitle className="min-w-0 flex-1 truncate text-base">
            {point ? fmt(t.camera.galleryLabel, { name: point.name }) : ""}
          </DialogTitle>
          <span
            className="font-mono text-sm text-white/80"
            data-testid="camera-gallery-counter"
            aria-live="polite"
          >
            {fmt(t.camera.counter, { i: current + 1, n: total })}
          </span>
          <DialogPrimitive.Close
            aria-label={t.camera.closeGallery}
            className="focus-visible:outline-ring inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <XIcon aria-hidden />
          </DialogPrimitive.Close>
        </header>

        <div
          className="relative min-h-0 touch-pan-y px-2 sm:px-16"
          onPointerDown={(e) => {
            swipeStart.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (swipeStart.current == null) return;
            const dx = e.clientX - swipeStart.current;
            swipeStart.current = null;
            if (Math.abs(dx) >= SWIPE_PX) go(current + (dx < 0 ? 1 : -1));
          }}
          onPointerCancel={() => {
            swipeStart.current = null;
          }}
        >
          {image && <MainImage key={image.id} image={image} />}
          <button
            type="button"
            onClick={() => go(current - 1)}
            disabled={current === 0}
            aria-label={t.camera.prev}
            className="focus-visible:outline-ring absolute top-1/2 left-1 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:outline-2 disabled:opacity-30 sm:left-3"
          >
            <ChevronLeftIcon aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(current + 1)}
            disabled={current >= total - 1}
            aria-label={t.camera.next}
            className="focus-visible:outline-ring absolute top-1/2 right-1 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:outline-2 disabled:opacity-30 sm:right-3"
          >
            <ChevronRightIcon aria-hidden />
          </button>
        </div>

        <p
          className="min-h-6 px-4 py-1 text-center text-sm text-white/90"
          data-testid="camera-gallery-caption"
        >
          {image?.caption ?? ""}
        </p>

        <nav aria-label={t.camera.thumbnails} className="px-2 pb-3">
          <ul className="flex gap-2 overflow-x-auto p-1">
            {images.map((img, i) => (
              <li key={img.id} className="shrink-0">
                <button
                  ref={i === current ? activeThumb : undefined}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={fmt(t.camera.openImage, { n: i + 1 })}
                  aria-current={i === current ? "true" : undefined}
                  className={cn(
                    "focus-visible:outline-ring block size-16 overflow-hidden rounded-md border-2 border-transparent opacity-60 outline-offset-2 hover:opacity-100 focus-visible:outline-2 sm:size-20",
                    i === current && "border-white opacity-100",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- behind auth, served by our own route */}
                  <img
                    src={imageUrl(img.thumbKey)}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    className="size-full object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
