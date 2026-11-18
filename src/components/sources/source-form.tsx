"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  networkSourceInputSchema,
  type NetworkSourceInput,
  type NetworkSourceValues,
} from "@/lib/validators/network-source";
import {
  createNetworkSourceAction,
  updateNetworkSourceAction,
} from "@/server/actions/sources";
import type { NetworkSource } from "@/server/network-sources";

export type ZoneOption = { id: string; name: string };

type Props = {
  /** Present when editing; absent when creating. */
  sourceId?: string;
  initial: NetworkSourceValues;
  zones: ZoneOption[];
  /** Existing `kind` values, offered as autocomplete suggestions. */
  kinds: string[];
  /** Show editable lat/lng inputs (pages); on the map they are read-only text. */
  editableCoordinates?: boolean;
  onSaved: (source: NetworkSource) => void;
  onCancel: () => void;
};

/** Create / edit form for a network source (PRD F6, admin). */
export function SourceForm({
  sourceId,
  initial,
  zones,
  kinds,
  editableCoordinates = false,
  onSaved,
  onCancel,
}: Props) {
  const { control, handleSubmit, setError, formState, watch } = useForm<
    NetworkSourceValues,
    unknown,
    NetworkSourceInput
  >({
    resolver: zodResolver(networkSourceInputSchema),
    defaultValues: {
      ...initial,
      description: initial.description ?? "",
      zoneId: initial.zoneId ?? "",
    },
  });
  const lat = watch("lat");
  const lng = watch("lng");
  const listId = "source-kinds";

  async function onSubmit(values: NetworkSourceInput) {
    const res = sourceId
      ? await updateNetworkSourceAction(sourceId, values)
      : await createNetworkSourceAction(values);
    if (!res.ok) {
      for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
        setError(field as keyof NetworkSourceValues, { message: messages[0] });
      }
      toast.error(res.error);
      return;
    }
    toast.success(sourceId ? id.source.updated : id.source.created);
    onSaved(res.data.source);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 p-4"
      data-testid="source-form"
    >
      <div>
        <h2 className="text-lg font-semibold">
          {sourceId ? id.source.editTitle : id.source.newTitle}
        </h2>
        {!editableCoordinates && (
          <p className="text-muted-foreground text-sm tabular-nums">
            {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
          </p>
        )}
      </div>

      <FieldGroup>
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="source-name">{id.source.name}</FieldLabel>
              <Input
                {...field}
                id="source-name"
                placeholder={id.source.namePlaceholder}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="kind"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="source-kind">{id.source.kind}</FieldLabel>
              <Input
                {...field}
                id="source-kind"
                list={listId}
                autoComplete="off"
                placeholder={id.source.kindPlaceholder}
                aria-invalid={fieldState.invalid}
              />
              <datalist id={listId}>
                {kinds.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="zoneId"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="source-zone">{id.source.zone}</FieldLabel>
              <NativeSelect
                {...field}
                value={field.value ?? ""}
                id="source-zone"
              >
                <option value="">{id.source.noZone}</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </NativeSelect>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {editableCoordinates && (
          <div className="grid grid-cols-2 gap-3">
            {(["lat", "lng"] as const).map((name) => (
              <Controller
                key={name}
                name={name}
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`source-${name}`}>
                      {id.source[name]}
                    </FieldLabel>
                    <Input
                      id={`source-${name}`}
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={Number.isFinite(field.value) ? field.value : ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? Number.NaN
                            : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            ))}
          </div>
        )}
        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="source-description">
                {id.source.description}
              </FieldLabel>
              <Textarea
                {...field}
                value={field.value ?? ""}
                id="source-description"
                rows={2}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
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
