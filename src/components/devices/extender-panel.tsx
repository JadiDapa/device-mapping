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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { id } from "@/lib/i18n/id";
import {
  extenderCreateSchema,
  extenderLabel,
  extenderUpdateSchema,
  type ExtenderCreateValues,
  type ExtenderUpdateValues,
} from "@/lib/validators/extender";
import {
  createExtenderAction,
  updateExtenderAction,
} from "@/server/actions/extenders";
import type { Extender } from "@/server/extenders";

export type ExtenderDeviceOption = {
  id: string;
  seq: number;
  locationDetail: string | null;
};

type FormValues = ExtenderCreateValues;

function deviceOption(d: ExtenderDeviceOption): string {
  return d.locationDetail ? `#${d.seq} · ${d.locationDetail}` : `#${d.seq}`;
}

type Props = {
  zoneId: string;
  devices: ExtenderDeviceOption[];
  /** Create: picked position. Edit: the extender being edited. */
  position?: { lat: number; lng: number };
  extender?: Extender;
  isAdmin: boolean;
  onSaved: (extender: Extender) => void;
  onBack: () => void;
  onDelete?: () => void;
};

/**
 * Create / edit / view panel for an extender. The pin label ("5→6") is derived
 * from the chosen devices' seq, so it follows later renumbering.
 */
export function ExtenderPanel({
  zoneId,
  devices,
  position,
  extender,
  isAdmin,
  onSaved,
  onBack,
  onDelete,
}: Props) {
  const editing = Boolean(extender);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { register, handleSubmit, setError, watch, formState } =
    useForm<FormValues>({
      resolver: zodResolver(
        editing ? extenderUpdateSchema : extenderCreateSchema,
      ) as never,
      defaultValues: {
        zoneId,
        fromDeviceId: extender?.fromDeviceId ?? "",
        toDeviceId: extender?.toDeviceId ?? "",
        locationDetail: extender?.locationDetail ?? "",
        notes: extender?.notes ?? "",
        lat: extender?.lat ?? position?.lat ?? 0,
        lng: extender?.lng ?? position?.lng ?? 0,
      },
    });

  const seqOf = (deviceId: string | null | undefined) =>
    devices.find((d) => d.id === deviceId)?.seq;
  const label = extenderLabel(
    seqOf(watch("fromDeviceId")),
    seqOf(watch("toDeviceId")),
  );

  async function onSubmit(values: FormValues) {
    const res =
      editing && extender
        ? await updateExtenderAction(
            extender.id,
            values satisfies ExtenderUpdateValues,
          )
        : await createExtenderAction(values);
    if (!res.ok) {
      for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
        setError(field as keyof FormValues, { message: messages[0] });
      }
      toast.error(res.error);
      return;
    }
    toast.success(editing ? id.extender.updated : id.extender.created);
    onSaved(res.data.extender);
  }

  const title = editing ? id.extender.detailTitle : id.extender.newTitle;

  if (!isAdmin && extender) {
    const from = seqOf(extender.fromDeviceId);
    const to = seqOf(extender.toDeviceId);
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeftIcon />
          {id.device.back}
        </Button>
        <h2 className="text-lg font-semibold">
          {id.extender.title} {extenderLabel(from, to)}
        </h2>
        {extender.locationDetail && <p>{extender.locationDetail}</p>}
        {extender.notes && (
          <p className="text-muted-foreground text-sm">{extender.notes}</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-4">
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
            {id.device.back}
          </Button>
        )}
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">
          {id.extender.connects}:{" "}
          <span data-testid="extender-label" className="font-medium">
            {label}
          </span>
        </p>
      </div>

      {devices.length === 0 && (
        <p className="text-muted-foreground text-sm">
          {id.extender.needDevices}
        </p>
      )}

      <FieldGroup>
        <Field data-invalid={!!formState.errors.fromDeviceId}>
          <FieldLabel htmlFor="extender-from">{id.extender.from}</FieldLabel>
          <NativeSelect id="extender-from" {...register("fromDeviceId")}>
            <option value="">{id.extender.none}</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {deviceOption(d)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field data-invalid={!!formState.errors.toDeviceId}>
          <FieldLabel htmlFor="extender-to">{id.extender.to}</FieldLabel>
          <NativeSelect id="extender-to" {...register("toDeviceId")}>
            <option value="">{id.extender.none}</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {deviceOption(d)}
              </option>
            ))}
          </NativeSelect>
          {formState.errors.toDeviceId && (
            <FieldError errors={[formState.errors.toDeviceId]} />
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="extender-location">
            {id.device.locationDetail}
          </FieldLabel>
          <Input id="extender-location" {...register("locationDetail")} />
        </Field>
        <Field>
          <FieldLabel htmlFor="extender-notes">{id.device.notes}</FieldLabel>
          <Textarea id="extender-notes" rows={3} {...register("notes")} />
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? id.common.saving : id.common.save}
        </Button>
        {!editing && (
          <Button type="button" variant="outline" onClick={onBack}>
            {id.common.cancel}
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
          >
            <Trash2Icon />
            {confirmDelete ? id.extender.deleteConfirm : id.common.delete}
          </Button>
        )}
      </div>
    </form>
  );
}
