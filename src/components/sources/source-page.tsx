"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { id } from "@/lib/i18n/id";
import { deleteNetworkSourceAction } from "@/server/actions/sources";
import { SourceDetail, type SourceDeviceItem } from "./source-detail";
import { SourceForm, type ZoneOption } from "./source-form";

type Props = {
  source: {
    id: string;
    name: string;
    kind: string;
    description: string | null;
    zoneId: string | null;
    zoneName: string | null;
    lat: number;
    lng: number;
    updatedAt: Date;
  };
  devices: SourceDeviceItem[];
  zones: ZoneOption[];
  kinds: string[];
  isAdmin: boolean;
};

/** `/network-sources/[id]`: detail + connected devices; admin edit/delete. */
export function SourcePage({ source, devices, zones, kinds, isAdmin }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  async function onDelete() {
    const res = await deleteNetworkSourceAction(source.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(id.source.deleted);
    router.push("/network-sources");
  }

  return (
    <div className="space-y-4">
      <Link
        href="/network-sources"
        className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
      >
        {id.source.viewAll}
      </Link>
      <Card className="max-w-xl">
        {editing ? (
          <SourceForm
            key={source.updatedAt.getTime()}
            sourceId={source.id}
            initial={{
              name: source.name,
              kind: source.kind,
              description: source.description,
              zoneId: source.zoneId,
              lat: source.lat,
              lng: source.lng,
            }}
            zones={zones}
            kinds={kinds}
            editableCoordinates
            onSaved={() => {
              setEditing(false);
              router.refresh();
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <SourceDetail
            source={source}
            devices={devices}
            isAdmin={isAdmin}
            onEdit={() => setEditing(true)}
            onDelete={onDelete}
          />
        )}
      </Card>
    </div>
  );
}
