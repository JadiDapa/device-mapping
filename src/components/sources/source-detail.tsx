"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react";
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
import { SeqBadge } from "@/components/devices/seq-badge";
import { fmt } from "@/lib/i18n/format";
import { id } from "@/lib/i18n/id";
import type { DeviceStatus } from "@/lib/status";

export type SourceDeviceItem = {
  id: string;
  seq: number;
  zoneId: string;
  zoneName: string;
  typeName: string;
  status: DeviceStatus;
  locationDetail: string | null;
};

type Props = {
  source: {
    id: string;
    name: string;
    kind: string;
    description: string | null;
    zoneName: string | null;
    lat: number;
    lng: number;
  };
  devices: SourceDeviceItem[];
  /** Zone the panel is shown in: its devices select in place, others link. */
  currentZoneId?: string;
  isAdmin: boolean;
  onBack?: () => void;
  onSelectDevice?: (deviceId: string) => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
};

/** Read-only summary of a source + connected devices; admin edit/delete. */
export function SourceDetail({
  source,
  devices,
  currentZoneId,
  isAdmin,
  onBack,
  onSelectDevice,
  onEdit,
  onDelete,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-4 p-4" data-testid="source-detail">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label={id.device.back}
            title={id.device.back}
          >
            <ArrowLeftIcon />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg leading-tight font-semibold">
            {source.name}
          </h2>
          <p className="text-muted-foreground truncate text-sm">
            {source.kind}
            {source.zoneName ? ` · ${source.zoneName}` : ""}
          </p>
        </div>
      </div>

      <dl className="space-y-3 text-sm">
        {source.description && (
          <div>
            <dt className="text-muted-foreground">{id.source.description}</dt>
            <dd className="whitespace-pre-wrap">{source.description}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">{id.source.coordinates}</dt>
          <dd className="tabular-nums">
            {source.lat.toFixed(6)}, {source.lng.toFixed(6)}
          </dd>
        </div>
      </dl>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">
          {id.source.devices} ({devices.length})
        </h3>
        {devices.length === 0 ? (
          <p className="text-muted-foreground text-sm">{id.source.noDevices}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {devices.map((d) => {
              const inPlace =
                onSelectDevice !== undefined && d.zoneId === currentZoneId;
              const body = (
                <>
                  <SeqBadge seq={d.seq} status={d.status} />
                  <span className="min-w-0 flex-1 text-left text-sm">
                    <span className="block truncate">{d.typeName}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {d.zoneName}
                      {d.locationDetail ? ` · ${d.locationDetail}` : ""}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={d.id} data-testid="source-device">
                  {inPlace ? (
                    <button
                      type="button"
                      onClick={() => onSelectDevice(d.id)}
                      className="hover:bg-muted flex min-h-11 w-full items-center gap-3 px-3 py-2"
                    >
                      {body}
                    </button>
                  ) : (
                    <Link
                      href={`/zones/${d.zoneId}?device=${d.id}`}
                      className="hover:bg-muted flex min-h-11 w-full items-center gap-3 px-3 py-2"
                    >
                      {body}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isAdmin && (
        <div className="flex gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onEdit}>
            <PencilIcon />
            {id.common.edit}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2Icon />
            {id.common.delete}
          </Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{id.source.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {source.name}.{" "}
              {devices.length > 0 &&
                fmt(id.source.deviceCount, { n: devices.length }) + ". "}
              {id.source.deleteDescription}
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
    </div>
  );
}
