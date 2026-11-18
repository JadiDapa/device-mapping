"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getDeviceIcon, RouterBadgeIcon } from "@/lib/device-icons";
import { id } from "@/lib/i18n/id";
import {
  deviceUpdateSchema,
  type DeviceStatusInput,
  type DeviceUpdateInput,
  type DeviceUpdateValues,
} from "@/lib/validators/device";
import type { ZoneDevice } from "@/server/devices";
import { DeviceHistory } from "./device-history";
import type { TypeOption } from "./device-form";
import { SeqBadge } from "./seq-badge";
import { ParentSelect, routerLabel, type RouterOption } from "./parent-select";
import { SourceSelect, type SourceOption } from "./source-select";
import { StatusSelector } from "./status-selector";

type Props = {
  device: ZoneDevice;
  types: TypeOption[];
  sources: SourceOption[];
  routers: RouterOption[];
  otherZones: { id: string; name: string }[];
  isAdmin: boolean;
  onBack: () => void;
  onApplyStatus: (input: DeviceStatusInput) => Promise<boolean>;
  onSaveDetail: (input: DeviceUpdateInput) => Promise<boolean>;
  onMoveZone: (zoneId: string) => Promise<void>;
  onDelete: () => Promise<void>;
};

export function DeviceDetail({
  device,
  types,
  sources,
  routers,
  otherZones,
  isAdmin,
  onBack,
  onApplyStatus,
  onSaveDetail,
  onMoveZone,
  onDelete,
}: Props) {
  const Icon = getDeviceIcon(device.typeIcon);
  // Re-mount status/history when the saved state changes.
  const statusKey = [
    device.id,
    device.status,
    device.hasPower,
    device.hasFo,
    device.hasEthernet,
    device.partialNote,
  ].join(":");

  return (
    <div className="space-y-4 p-4" data-testid="device-detail">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={id.device.back}
          title={id.device.back}
        >
          <ArrowLeftIcon />
        </Button>
        <SeqBadge seq={device.seq} status={device.status} className="size-9" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg leading-tight font-semibold">
            {id.device.seq} {device.seq}
          </h2>
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{device.typeName}</span>
            {device.isRouter && (
              <Badge variant="secondary" className="gap-1">
                <RouterBadgeIcon aria-hidden />
                {id.device.router}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="detail">
        <TabsList>
          <TabsTrigger value="detail">{id.device.detailTab}</TabsTrigger>
          <TabsTrigger value="history">{id.device.historyTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{id.device.status}</h3>
            <StatusSelector
              key={statusKey}
              device={device}
              canEdit={isAdmin}
              onApply={onApplyStatus}
            />
          </section>

          {isAdmin ? (
            <EditForm
              key={`${device.id}:${device.updatedAt.getTime()}`}
              device={device}
              types={types}
              sources={sources}
              routers={routers}
              onSave={onSaveDetail}
            />
          ) : (
            <ReadOnlyFields
              device={device}
              sources={sources}
              routers={routers}
            />
          )}

          <dl className="text-sm">
            <dt className="text-muted-foreground">{id.device.coordinates}</dt>
            <dd className="tabular-nums">
              {device.lat.toFixed(6)}, {device.lng.toFixed(6)}
            </dd>
          </dl>

          {isAdmin && (
            <AdminActions
              device={device}
              otherZones={otherZones}
              onMoveZone={onMoveZone}
              onDelete={onDelete}
            />
          )}
        </TabsContent>

        <TabsContent value="history">
          <DeviceHistory
            deviceId={device.id}
            version={`${device.status}:${device.updatedAt.getTime()}`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReadOnlyFields({
  device,
  sources,
  routers,
}: {
  device: ZoneDevice;
  sources: SourceOption[];
  routers: RouterOption[];
}) {
  const source = sources.find((s) => s.id === device.networkSourceId);
  const parent = routers.find((r) => r.id === device.parentDeviceId);
  return (
    <dl className="space-y-3 text-sm">
      <div>
        <dt className="text-muted-foreground">{id.device.locationDetail}</dt>
        <dd>{device.locationDetail ?? id.device.noLocation}</dd>
      </div>
      {device.isRouter ? (
        <div>
          <dt className="text-muted-foreground">{id.source.deviceField}</dt>
          <dd>{source ? `${source.name} (${source.kind})` : "—"}</dd>
        </div>
      ) : (
        <div>
          <dt className="text-muted-foreground">{id.device.parentField}</dt>
          <dd>{parent ? routerLabel(parent) : "—"}</dd>
        </div>
      )}
      <div>
        <dt className="text-muted-foreground">{id.device.notes}</dt>
        <dd className="whitespace-pre-wrap">{device.notes ?? "—"}</dd>
      </div>
    </dl>
  );
}

function EditForm({
  device,
  types,
  sources,
  routers,
  onSave,
}: {
  device: ZoneDevice;
  types: TypeOption[];
  sources: SourceOption[];
  routers: RouterOption[];
  onSave: (input: DeviceUpdateInput) => Promise<boolean>;
}) {
  const { control, handleSubmit, formState, watch, setValue } = useForm<
    DeviceUpdateValues,
    unknown,
    DeviceUpdateInput
  >({
    resolver: zodResolver(deviceUpdateSchema),
    defaultValues: {
      deviceTypeId: device.deviceTypeId,
      isRouter: device.isRouter,
      locationDetail: device.locationDetail ?? "",
      notes: device.notes ?? "",
      networkSourceId: device.networkSourceId ?? "",
      parentDeviceId: device.parentDeviceId ?? "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSave({
          ...values,
          expectedUpdatedAt: device.updatedAt.toISOString(),
        });
      })}
      className="space-y-4"
    >
      <FieldGroup>
        <Controller
          name="deviceTypeId"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="edit-device-type">
                {id.device.type}
              </FieldLabel>
              <NativeSelect {...field} id="edit-device-type">
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
              htmlFor="edit-device-router"
              className="flex min-h-11 items-center gap-2 text-sm md:min-h-0"
            >
              <Checkbox
                id="edit-device-router"
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
              <FieldLabel htmlFor="edit-device-location">
                {id.device.locationDetail}
              </FieldLabel>
              <Input
                {...field}
                value={field.value ?? ""}
                id="edit-device-location"
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
              <FieldLabel htmlFor="edit-device-notes">
                {id.device.notes}
              </FieldLabel>
              <Textarea
                {...field}
                value={field.value ?? ""}
                id="edit-device-notes"
                rows={2}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {watch("isRouter") === true ? (
          <SourceSelect
            htmlId="edit-device-source"
            value={watch("networkSourceId")}
            onChange={(v) =>
              setValue("networkSourceId", v, { shouldDirty: true })
            }
            sources={sources}
            zoneId={device.zoneId}
          />
        ) : (
          <ParentSelect
            htmlId="edit-device-parent"
            value={watch("parentDeviceId")}
            onChange={(v) =>
              setValue("parentDeviceId", v, { shouldDirty: true })
            }
            routers={routers.filter((r) => r.id !== device.id)}
          />
        )}
      </FieldGroup>
      <Button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? id.common.saving : id.common.save}
      </Button>
    </form>
  );
}

function AdminActions({
  device,
  otherZones,
  onMoveZone,
  onDelete,
}: {
  device: ZoneDevice;
  otherZones: { id: string; name: string }[];
  onMoveZone: (zoneId: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [targetZone, setTargetZone] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [moving, setMoving] = useState(false);

  return (
    <section className="space-y-4 border-t pt-4">
      {otherZones.length > 0 && (
        <div className="space-y-2">
          <label htmlFor="move-zone" className="text-sm font-medium">
            {id.device.moveZone}
          </label>
          <div className="flex gap-2">
            <NativeSelect
              id="move-zone"
              value={targetZone}
              onChange={(e) => setTargetZone(e.target.value)}
            >
              <option value="">{id.device.moveZoneSelect}</option>
              {otherZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </NativeSelect>
            <Button
              type="button"
              variant="outline"
              disabled={!targetZone || moving}
              onClick={async () => {
                setMoving(true);
                await onMoveZone(targetZone);
                setMoving(false);
              }}
            >
              {id.device.moveZoneAction}
            </Button>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="destructive"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2Icon />
        {id.common.delete}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {id.device.deleteTitle} ({id.device.seq} {device.seq})
            </AlertDialogTitle>
            <AlertDialogDescription>
              {id.device.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{id.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onDelete()}>
              {id.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
