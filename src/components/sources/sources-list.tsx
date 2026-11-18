"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fmt } from "@/lib/i18n/format";
import { id } from "@/lib/i18n/id";
import { publicEnv } from "@/lib/public-env";
import { SourceForm, type ZoneOption } from "./source-form";

export type SourceListItem = {
  id: string;
  name: string;
  kind: string;
  zoneName: string | null;
  deviceCount: number;
};

/** `/network-sources`: all sources; admin can add one by typing coordinates. */
export function SourcesList({
  sources,
  zones,
  kinds,
  isAdmin,
}: {
  sources: SourceListItem[];
  zones: ZoneOption[];
  kinds: string[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{id.source.title}</h1>
        {isAdmin && !creating && (
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            {id.source.add}
          </Button>
        )}
      </div>

      {creating && (
        <Card className="max-w-xl">
          <SourceForm
            initial={{
              name: "",
              kind: "",
              description: "",
              zoneId: null,
              lat: publicEnv.defaultCenter.lat,
              lng: publicEnv.defaultCenter.lng,
            }}
            zones={zones}
            kinds={kinds}
            editableCoordinates
            onSaved={(source) => {
              setCreating(false);
              router.push(`/network-sources/${source.id}`);
            }}
            onCancel={() => setCreating(false)}
          />
        </Card>
      )}

      {sources.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          {id.source.empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{id.source.name}</th>
                <th className="px-3 py-2 font-medium">{id.source.kind}</th>
                <th className="px-3 py-2 font-medium">{id.source.zone}</th>
                <th className="px-3 py-2 text-right font-medium">
                  {id.source.devices}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sources.map((s) => (
                <tr key={s.id} data-testid="source-row">
                  <td className="px-3 py-2">
                    <Link
                      href={`/network-sources/${s.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{s.kind}</td>
                  <td className="text-muted-foreground px-3 py-2">
                    {s.zoneName ?? id.source.noZone}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmt(id.source.deviceCount, { n: s.deviceCount })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
