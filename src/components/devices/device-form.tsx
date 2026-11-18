"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { fmt } from "@/lib/i18n/format";
import { id } from "@/lib/i18n/id";
import {
  deviceCreateSchema,
  type DeviceCreateInput,
  type DeviceCreateValues,
} from "@/lib/validators/device";
import { createDeviceAction } from "@/server/actions/devices";
import type { Device } from "@/server/devices";
import { ConnectionTypeSelect } from "./connection-type-select";
import { PartialFields } from "./partial-fields";
import { ParentSelect, type RouterOption } from "./parent-select";
import { SourceSelect, type SourceOption } from "./source-select";
import { StatusSegmented } from "./status-segmented";

export type TypeOption = { id: string; name: string };

/** Create form shown after a point was picked on the map (PRD F4, admin). */
export function DeviceForm({
  zoneId,
  position,
  nextSeq,
  types,
  sources,
  routers,
  onCreated,
  onCancel,
}: {
  zoneId: string;
  position: { lat: number; lng: number };
  nextSeq: number;
  types: TypeOption[];
  sources: SourceOption[];
  routers: RouterOption[];
  onCreated: (device: Device) => void;
  onCancel: () => void;
}) {
  const { control, handleSubmit, setError, watch, setValue, formState } =
    useForm<DeviceCreateValues, unknown, DeviceCreateInput>({
      resolver: zodResolver(deviceCreateSchema),
      defaultValues: {
        zoneId,
        deviceTypeId: types[0]?.id ?? "",
        isRouter: false,
        connectionType: "lan_poe",
        locationDetail: "",
        notes: "",
        networkSourceId: "",
        parentDeviceId: "",
        lat: position.lat,
        lng: position.lng,
        status: "not_installed",
        hasPower: false,
        hasFo: false,
        hasEthernet: false,
        partialNote: "",
      },
    });

  const status = watch("status");
  const partialValue = {
    hasPower: watch("hasPower") === true,
    hasFo: watch("hasFo") === true,
    hasEthernet: watch("hasEthernet") === true,
    partialNote: watch("partialNote") ?? "",
  };

  async function onSubmit(values: DeviceCreateInput) {
    const res = await createDeviceAction(values);
    if (!res.ok) {
      for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
        setError(field as keyof DeviceCreateValues, {
          message: messages[0],
        });
      }
      toast.error(res.error);
      return;
    }
    toast.success(id.device.created);
    onCreated(res.data.device);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-4">
      <div>
        <h2 className="text-lg font-semibold">{id.device.newTitle}</h2>
        <p className="text-muted-foreground text-sm">
          {fmt(id.device.nextSeq, { seq: nextSeq })} ·{" "}
          <span className="tabular-nums">
            {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </span>
        </p>
      </div>

      <FieldGroup>
        <Controller
          name="deviceTypeId"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="new-device-type">
                {id.device.type}
              </FieldLabel>
              <NativeSelect
                {...field}
                id="new-device-type"
                aria-invalid={fieldState.invalid}
              >
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </NativeSelect>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="isRouter"
          control={control}
          render={({ field }) => (
            <label
              htmlFor="new-device-router"
              className="flex min-h-11 items-center gap-2 text-sm md:min-h-0"
            >
              <Checkbox
                id="new-device-router"
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
              {id.device.isRouter}
            </label>
          )}
        />
        <Controller
          name="locationDetail"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="new-device-location">
                {id.device.locationDetail}
              </FieldLabel>
              <Input
                {...field}
                value={field.value ?? ""}
                id="new-device-location"
                placeholder={id.device.locationDetailPlaceholder}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="notes"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="new-device-notes">
                {id.device.notes}
              </FieldLabel>
              <Textarea
                {...field}
                value={field.value ?? ""}
                id="new-device-notes"
                rows={2}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <SourceSelect
          htmlId="new-device-source"
          value={watch("networkSourceId")}
          onChange={(v) => {
            setValue("networkSourceId", v);
            if (v) setValue("parentDeviceId", "");
          }}
          sources={sources}
          zoneId={zoneId}
        />
        {watch("isRouter") !== true && (
          <ParentSelect
            htmlId="new-device-parent"
            value={watch("parentDeviceId")}
            onChange={(v) => {
              setValue("parentDeviceId", v);
              if (v) setValue("networkSourceId", "");
            }}
            routers={routers}
          />
        )}
        <ConnectionTypeSelect
          htmlId="new-device-connection"
          value={watch("connectionType")}
          onChange={(v) => setValue("connectionType", v)}
        />
        <Field>
          <FieldLabel>{id.device.status}</FieldLabel>
          <StatusSegmented
            label={id.device.status}
            value={status}
            onChange={(s) =>
              setValue("status", s, { shouldValidate: formState.isSubmitted })
            }
          />
        </Field>
        {status === "partial" && (
          <PartialFields
            value={partialValue}
            onChange={(patch) => {
              const opts = { shouldValidate: formState.isSubmitted };
              if (patch.hasPower !== undefined)
                setValue("hasPower", patch.hasPower, opts);
              if (patch.hasFo !== undefined)
                setValue("hasFo", patch.hasFo, opts);
              if (patch.hasEthernet !== undefined)
                setValue("hasEthernet", patch.hasEthernet, opts);
              if (patch.partialNote !== undefined)
                setValue("partialNote", patch.partialNote, opts);
            }}
            error={formState.errors.partialNote?.message}
          />
        )}
      </FieldGroup>

      <div className="flex gap-2">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? id.common.saving : id.common.save}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={formState.isSubmitting}
        >
          {id.common.cancel}
        </Button>
      </div>
    </form>
  );
}
