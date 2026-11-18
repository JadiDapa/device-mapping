"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fmt } from "@/lib/i18n/format";
import { id as t } from "@/lib/i18n/id";
import {
  cameraPointCreateSchema,
  cameraPointUpdateSchema,
  type CameraPointCreateValues,
} from "@/lib/validators/camera";
import {
  createCameraPointAction,
  updateCameraPointAction,
} from "@/server/actions/camera-points";
import { CameraImageManager } from "./camera-image-manager";
import type { CameraPointView } from "./types";

type FormValues = CameraPointCreateValues;

type Props = {
  zoneId: string;
  /** Create: the picked position. */
  position?: { lat: number; lng: number };
  /** Edit / view: the point shown. */
  point?: CameraPointView;
  isAdmin: boolean;
  onCreated: (point: CameraPointView) => void;
  onPatch: (patch: Partial<CameraPointView>) => void;
  onBack: () => void;
  onDelete?: () => void;
  onOpenGallery: (index: number) => void;
  /** Re-sync with the server (after uploads settle). */
  onRefresh: () => void;
};

/** Create / edit / view panel of a camera capture point and its photos. */
export function CameraPointPanel({
  zoneId,
  position,
  point,
  isAdmin,
  onCreated,
  onPatch,
  onBack,
  onDelete,
  onOpenGallery,
  onRefresh,
}: Props) {
  const editing = Boolean(point);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { register, handleSubmit, setError, formState } = useForm<FormValues>({
    resolver: zodResolver(
      editing ? cameraPointUpdateSchema : cameraPointCreateSchema,
    ) as never,
    defaultValues: {
      zoneId,
      name: point?.name ?? "",
      notes: point?.notes ?? "",
      lat: point?.lat ?? position?.lat ?? 0,
      lng: point?.lng ?? position?.lng ?? 0,
    },
  });

  async function onSubmit(values: FormValues) {
    const res =
      editing && point
        ? await updateCameraPointAction(point.id, values)
        : await createCameraPointAction(values);
    if (!res.ok) {
      for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
        setError(field as keyof FormValues, { message: messages[0] });
      }
      toast.error(res.error);
      return;
    }
    toast.success(editing ? t.camera.updated : t.camera.created);
    const saved = res.data.point;
    if (editing) onPatch({ name: saved.name, notes: saved.notes });
    else onCreated({ ...saved, images: [] });
  }

  const title = editing ? t.camera.detailTitle : t.camera.newTitle;
  const photoCount = point?.images.length ?? 0;

  if (!isAdmin && point) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeftIcon />
          {t.device.back}
        </Button>
        <h2 className="text-lg font-semibold">{point.name}</h2>
        {point.notes && (
          <p className="text-muted-foreground text-sm">{point.notes}</p>
        )}
        <CameraImageManager
          point={point}
          isAdmin={false}
          onImagesChange={(images) => onPatch({ images })}
          onOpenGallery={onOpenGallery}
          onUploadsSettled={onRefresh}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1">
          {editing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="-ml-2"
            >
              <ArrowLeftIcon />
              {t.device.back}
            </Button>
          )}
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>

        <FieldGroup>
          <Field data-invalid={!!formState.errors.name}>
            <FieldLabel htmlFor="camera-name">{t.camera.name}</FieldLabel>
            <Input
              id="camera-name"
              placeholder={t.camera.namePlaceholder}
              maxLength={100}
              {...register("name")}
            />
            {formState.errors.name && (
              <FieldError errors={[formState.errors.name]} />
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="camera-notes">{t.camera.notes}</FieldLabel>
            <Textarea id="camera-notes" rows={3} {...register("notes")} />
          </Field>
        </FieldGroup>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t.common.saving : t.common.save}
          </Button>
          {!editing && (
            <Button type="button" variant="outline" onClick={onBack}>
              {t.common.cancel}
            </Button>
          )}
          {editing && onDelete && (
            <Button
              type="button"
              variant={confirmDelete ? "destructive" : "outline"}
              className="ml-auto"
              onClick={() =>
                confirmDelete ? onDelete() : setConfirmDelete(true)
              }
              onBlur={() => setConfirmDelete(false)}
            >
              <Trash2Icon />
              {confirmDelete
                ? photoCount > 0
                  ? fmt(t.camera.deleteConfirmWithImages, { n: photoCount })
                  : t.camera.deleteConfirm
                : t.common.delete}
            </Button>
          )}
        </div>
      </form>

      {point ? (
        <CameraImageManager
          point={point}
          isAdmin
          onImagesChange={(images) => onPatch({ images })}
          onOpenGallery={onOpenGallery}
          onUploadsSettled={onRefresh}
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          {t.camera.uploadSaveFirst}
        </p>
      )}
    </div>
  );
}
