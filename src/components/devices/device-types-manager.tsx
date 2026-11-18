"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DEVICE_ICON_NAMES,
  getDeviceIcon,
  type DeviceIconName,
} from "@/lib/device-icons";
import { fmt } from "@/lib/i18n/format";
import { id } from "@/lib/i18n/id";
import { cn } from "@/lib/utils";
import {
  deviceTypeInputSchema,
  type DeviceTypeFormValues,
} from "@/lib/validators/device-type";
import {
  createDeviceTypeAction,
  deleteDeviceTypeAction,
  updateDeviceTypeAction,
} from "@/server/actions/deviceTypes";

type TypeRow = {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  usageCount: number;
};

export function DeviceTypesManager({ types }: { types: TypeRow[] }) {
  const router = useRouter();
  // `null` = form closed, "new" = creating, otherwise the id being edited.
  const [editing, setEditing] = useState<null | "new" | string>(null);
  const [toDelete, setToDelete] = useState<TypeRow | null>(null);

  async function confirmDelete() {
    if (!toDelete) return;
    const res = await deleteDeviceTypeAction(toDelete.id);
    setToDelete(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(id.deviceType.deleted);
    router.refresh();
  }

  const editingType = types.find((t) => t.id === editing);

  return (
    <div className="space-y-4">
      {editing === null && (
        <Button onClick={() => setEditing("new")}>
          <PlusIcon />
          {id.deviceType.newTitle}
        </Button>
      )}

      {editing !== null && (
        <TypeForm
          // Re-mount when switching between create / different rows.
          key={editing}
          type={editingType}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {types.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          {id.deviceType.empty}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {types.map((t) => {
            const Icon = getDeviceIcon(t.icon);
            return (
              <li key={t.id} className="flex items-center gap-3 p-3">
                <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{t.name}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {t.description ?? id.dashboard.noDescription} ·{" "}
                    {fmt(id.deviceType.usageCount, { n: t.usageCount })}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`${id.common.edit} ${t.name}`}
                  onClick={() => setEditing(t.id)}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`${id.common.delete} ${t.name}`}
                  onClick={() => setToDelete(t)}
                >
                  <Trash2Icon />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {id.deviceType.deleteConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete &&
                (toDelete.usageCount > 0
                  ? fmt(id.deviceType.inUse, { n: toDelete.usageCount })
                  : fmt(id.deviceType.deleteConfirmDescription, {
                      name: toDelete.name,
                    }))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{id.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={(toDelete?.usageCount ?? 0) > 0}
            >
              {id.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TypeForm({
  type,
  onDone,
  onCancel,
}: {
  type?: TypeRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { control, handleSubmit, setError, formState } = useForm<
    DeviceTypeFormValues,
    unknown,
    z.output<typeof deviceTypeInputSchema>
  >({
    resolver: zodResolver(deviceTypeInputSchema),
    defaultValues: {
      name: type?.name ?? "",
      icon: (type?.icon as DeviceIconName | undefined) ?? DEVICE_ICON_NAMES[0],
      description: type?.description ?? "",
    },
  });

  async function onSubmit(values: z.output<typeof deviceTypeInputSchema>) {
    const res = type
      ? await updateDeviceTypeAction(type.id, values)
      : await createDeviceTypeAction(values);
    if (!res.ok) {
      const nameError = res.fieldErrors?.name?.[0];
      if (nameError) setError("name", { message: nameError });
      toast.error(res.error);
      return;
    }
    toast.success(type ? id.deviceType.updated : id.deviceType.created);
    onDone();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type ? id.deviceType.editTitle : id.deviceType.newTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FieldGroup>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="device-type-name">
                    {id.deviceType.name}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="device-type-name"
                    placeholder={id.deviceType.namePlaceholder}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="icon"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{id.deviceType.icon}</FieldLabel>
                  <div
                    role="radiogroup"
                    aria-label={id.deviceType.icon}
                    className="grid grid-cols-5 gap-2 sm:grid-cols-8"
                  >
                    {DEVICE_ICON_NAMES.map((name) => {
                      const Icon = getDeviceIcon(name);
                      const selected = field.value === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={name}
                          title={name}
                          onClick={() => field.onChange(name)}
                          className={cn(
                            "focus-visible:ring-ring/50 flex h-11 items-center justify-center rounded-md border outline-none focus-visible:ring-[3px]",
                            selected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "hover:bg-accent",
                          )}
                        >
                          <Icon className="size-5" aria-hidden />
                        </button>
                      );
                    })}
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="device-type-description">
                    {id.deviceType.description}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    id="device-type-description"
                    rows={2}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
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
      </CardContent>
    </Card>
  );
}
