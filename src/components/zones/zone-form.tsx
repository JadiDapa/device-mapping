"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { z } from "zod";
import { MapView } from "@/components/map";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GeoJsonPolygon } from "@/db/schema";
import { id } from "@/lib/i18n/id";
import { zoneFormSchema, type ZoneFormValues } from "@/lib/validators/zone";
import { createZoneAction, updateZoneAction } from "@/server/actions/zones";

type Props = {
  zone?: {
    id: string;
    name: string;
    description: string | null;
    boundary: GeoJsonPolygon | null;
    centerLat: number | null;
    centerLng: number | null;
    defaultZoom: number | null;
    /** ISO updated_at when the page loaded, for the stale-write check. */
    updatedAt: string;
  };
};

export function ZoneForm({ zone }: Props) {
  const router = useRouter();
  const [boundary, setBoundary] = useState<GeoJsonPolygon | null>(
    zone?.boundary ?? null,
  );
  const { control, handleSubmit, setError, formState } = useForm<
    ZoneFormValues,
    unknown,
    z.output<typeof zoneFormSchema>
  >({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: {
      name: zone?.name ?? "",
      description: zone?.description ?? "",
    },
  });

  async function onSubmit(values: z.output<typeof zoneFormSchema>) {
    const payload = { ...values, boundary };

    if (!zone) {
      const res = await createZoneAction(payload);
      if (!res.ok) return fail(res);
      toast.success(id.zone.created);
      router.push(`/zones/${res.data.id}`);
      return;
    }

    const res = await updateZoneAction(zone.id, {
      ...payload,
      expectedUpdatedAt: zone.updatedAt,
    });
    if (!res.ok) return fail(res);
    if (res.data.staleWrite) toast.warning(id.zone.staleWrite);
    else toast.success(id.zone.updated);
    router.push(`/zones/${zone.id}`);
    router.refresh();
  }

  function fail(res: {
    error: string;
    fieldErrors?: Record<string, string[]>;
  }) {
    const nameError = res.fieldErrors?.name?.[0];
    if (nameError) setError("name", { message: nameError });
    toast.error(res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{id.zone.name}</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder={id.zone.namePlaceholder}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                {id.zone.description}
              </FieldLabel>
              <Textarea
                {...field}
                value={field.value ?? ""}
                id={field.name}
                rows={3}
                placeholder={id.zone.descriptionPlaceholder}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Field>
          <FieldLabel>{id.zone.boundary}</FieldLabel>
          <FieldDescription>
            {boundary ? id.zone.boundaryHint : id.zone.noBoundary}
          </FieldDescription>
          <div className="relative h-[55vh] min-h-80 overflow-hidden rounded-lg border">
            <MapView
              boundary={zone?.boundary ?? null}
              onBoundaryChange={setBoundary}
              center={
                zone?.centerLat != null && zone.centerLng != null
                  ? { lat: zone.centerLat, lng: zone.centerLng }
                  : null
              }
              zoom={zone?.defaultZoom}
            />
          </div>
        </Field>
      </FieldGroup>
      <div className="flex gap-2">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? id.common.saving : id.common.save}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={formState.isSubmitting}
        >
          {id.common.cancel}
        </Button>
      </div>
    </form>
  );
}
