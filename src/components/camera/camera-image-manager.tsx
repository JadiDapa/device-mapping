"use client";

import { useEffect, useRef, useState } from "react";
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
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeftToLineIcon,
  ArrowRightToLineIcon,
  GripVerticalIcon,
  ImagePlusIcon,
  RotateCcwIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmt } from "@/lib/i18n/format";
import { id as t } from "@/lib/i18n/id";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/validators/camera";
import {
  deleteCameraImageAction,
  reorderImagesAction,
  updateImageCaptionAction,
} from "@/server/actions/camera-points";
import { cn } from "@/lib/utils";
import { imageUrl, type CameraImageView, type CameraPointView } from "./types";
import { useImageUpload } from "./use-image-upload";

type Props = {
  point: CameraPointView;
  isAdmin: boolean;
  onImagesChange: (images: CameraImageView[]) => void;
  onOpenGallery: (index: number) => void;
  /** Ask the server for fresh data (after uploads settle). */
  onUploadsSettled: () => void;
};

const renumber = (images: CameraImageView[]) =>
  images.map((img, position) => ({ ...img, position }));

function SortableImage({
  image,
  index,
  total,
  isAdmin,
  onOpen,
  onMove,
  onCaption,
  onDelete,
}: {
  image: CameraImageView;
  index: number;
  total: number;
  isAdmin: boolean;
  onOpen: () => void;
  onMove: (to: number) => void;
  onCaption: (caption: string) => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled: !isAdmin });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-card space-y-1.5 rounded-lg border p-1.5",
        isDragging && "relative z-10 opacity-80 shadow-lg",
      )}
      data-testid="camera-image-item"
    >
      <div className="relative">
        <button
          type="button"
          onClick={onOpen}
          aria-label={fmt(t.camera.openImage, { n: index + 1 })}
          className="focus-visible:outline-ring block aspect-[4/3] w-full overflow-hidden rounded-md outline-offset-2 focus-visible:outline-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- behind auth, served by our own route */}
          <img
            src={imageUrl(image.thumbKey)}
            alt={image.caption ?? ""}
            loading="lazy"
            className="size-full object-cover"
          />
        </button>
        <span className="bg-card/90 text-card-foreground pointer-events-none absolute top-1 left-1 rounded-full border px-1.5 text-[10px] font-semibold">
          {index + 1}
        </span>
      </div>
      {isAdmin ? (
        <>
          <Input
            key={image.caption ?? ""}
            defaultValue={image.caption ?? ""}
            placeholder={t.camera.captionPlaceholder}
            aria-label={`${t.camera.caption} ${index + 1}`}
            maxLength={300}
            className="h-8 text-xs"
            onBlur={(e) => {
              const next = e.currentTarget.value.trim();
              if (next !== (image.caption ?? "")) onCaption(next);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <div className="flex items-center gap-0.5">
            <Button
              ref={setActivatorNodeRef}
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 cursor-grab touch-none"
              aria-label={t.camera.dragHandle}
              title={t.camera.dragHandle}
              {...attributes}
              {...listeners}
            >
              <GripVerticalIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={t.camera.moveUp}
              title={t.camera.moveUp}
              disabled={index === 0}
              onClick={() => onMove(index - 1)}
            >
              <ArrowLeftToLineIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={t.camera.moveDown}
              title={t.camera.moveDown}
              disabled={index === total - 1}
              onClick={() => onMove(index + 1)}
            >
              <ArrowRightToLineIcon />
            </Button>
            <Button
              type="button"
              variant={confirmDelete ? "destructive" : "ghost"}
              size={confirmDelete ? "sm" : "icon"}
              className={cn("ml-auto", !confirmDelete && "size-8")}
              aria-label={t.camera.deleteImage}
              title={t.camera.deleteImage}
              onClick={() =>
                confirmDelete ? onDelete() : setConfirmDelete(true)
              }
              onBlur={() => setConfirmDelete(false)}
            >
              <Trash2Icon />
              {confirmDelete && t.camera.deleteImageConfirm}
            </Button>
          </div>
        </>
      ) : (
        image.caption && (
          <p className="text-muted-foreground px-0.5 text-xs">
            {image.caption}
          </p>
        )
      )}
    </li>
  );
}

/**
 * Admin: upload (multi-select / drag-and-drop), caption, reorder, delete.
 * Guest: read-only grid that opens the gallery.
 */
export function CameraImageManager({
  point,
  isAdmin,
  onImagesChange,
  onOpenGallery,
  onUploadsSettled,
}: Props) {
  const images = point.images;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  // Uploads finish out of the render cycle; keep the latest list reachable.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const upload = useImageUpload({
    pointId: point.id,
    currentCount: images.length,
    onUploaded: (image) => {
      onImagesChange([...imagesRef.current, image]);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function applyOrder(next: CameraImageView[]) {
    const previous = images;
    onImagesChange(renumber(next));
    const res = await reorderImagesAction(
      point.id,
      next.map((i) => i.id),
    );
    if (!res.ok) {
      toast.error(res.error);
      onImagesChange(previous);
    } else {
      toast.success(t.camera.reordered);
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = images.findIndex((i) => i.id === active.id);
    const to = images.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    void applyOrder(arrayMove(images, from, to));
  }

  async function saveCaption(image: CameraImageView, caption: string) {
    const res = await updateImageCaptionAction(image.id, { caption });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    onImagesChange(
      imagesRef.current.map((i) =>
        i.id === image.id ? { ...i, caption: caption || null } : i,
      ),
    );
    toast.success(t.camera.captionSaved);
  }

  async function removeImage(image: CameraImageView) {
    const res = await deleteCameraImageAction(image.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    onImagesChange(
      renumber(imagesRef.current.filter((i) => i.id !== image.id)),
    );
    toast.success(t.camera.imageDeleted);
  }

  function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    upload.add(Array.from(files));
    if (inputRef.current) inputRef.current.value = "";
  }

  const uploading = upload.items.some((i) => i.status !== "error");
  const wasUploading = useRef(false);
  useEffect(() => {
    if (uploading) {
      wasUploading.current = true;
    } else if (wasUploading.current) {
      // Queue drained: re-sync with the server once.
      wasUploading.current = false;
      onUploadsSettled();
    }
  }, [uploading, onUploadsSettled]);

  return (
    <section className="space-y-3" aria-label={t.camera.uploadTitle}>
      <h3 className="text-base font-semibold">
        {t.camera.uploadTitle}{" "}
        <span className="text-muted-foreground text-sm font-normal">
          ({images.length})
        </span>
      </h3>

      {isAdmin && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pick(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center",
            dragOver && "border-foreground bg-muted",
          )}
          data-testid="camera-dropzone"
        >
          <ImagePlusIcon className="text-muted-foreground size-6" aria-hidden />
          <p className="text-sm">{t.camera.uploadHint}</p>
          <p className="text-muted-foreground text-xs">
            {t.camera.uploadFormats}
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            data-testid="camera-file-input"
            onChange={(e) => pick(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlusIcon />
            {t.camera.uploadChoose}
          </Button>
        </div>
      )}

      {upload.items.length > 0 && (
        <ul className="space-y-1.5" aria-live="polite">
          {upload.items.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs"
            >
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {item.status === "error" ? (
                <>
                  <span className="text-destructive">
                    {item.error ?? t.camera.uploadFailed}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={t.camera.retry}
                    title={t.camera.retry}
                    onClick={() => upload.retry(item.key)}
                  >
                    <RotateCcwIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={t.common.cancel}
                    onClick={() => upload.dismiss(item.key)}
                  >
                    <XIcon />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">
                    {item.status === "compressing"
                      ? t.camera.compressing
                      : t.camera.uploading}
                  </span>
                  <progress
                    className="h-1.5 w-16"
                    value={
                      item.status === "uploading" ? item.progress : undefined
                    }
                    max={1}
                    aria-label={item.name}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {images.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.camera.noImages}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={images.map((i) => i.id)}
            strategy={rectSortingStrategy}
          >
            <ul className="grid grid-cols-2 gap-2">
              {images.map((image, index) => (
                <SortableImage
                  key={image.id}
                  image={image}
                  index={index}
                  total={images.length}
                  isAdmin={isAdmin}
                  onOpen={() => onOpenGallery(index)}
                  onMove={(to) => void applyOrder(arrayMove(images, index, to))}
                  onCaption={(c) => void saveCaption(image, c)}
                  onDelete={() => void removeImage(image)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
