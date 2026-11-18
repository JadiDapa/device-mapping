"use client";

import { useState } from "react";
import { DownloadIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { downloadFile } from "@/lib/download";
import { pdfFilename } from "@/lib/export-filename";
import { fmt } from "@/lib/i18n/format";
import { id } from "@/lib/i18n/id";

type ZoneRow = { id: string; name: string; total: number };

/** `/export`: pick zones (+ "select all"), download the PDF recap. */
export function ExportForm({ zones }: { zones: ZoneRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const allSelected = zones.length > 0 && selected.size === zones.length;

  function toggle(zoneId: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(zoneId);
      else next.delete(zoneId);
      return next;
    });
  }

  async function onDownload() {
    setBusy(true);
    const toastId = toast.loading(id.export.preparing);
    try {
      const query = zones
        .filter((z) => selected.has(z.id))
        .map((z) => z.id)
        .join(",");
      const res = await downloadFile(
        `/api/export/pdf?zones=${encodeURIComponent(query)}`,
        pdfFilename(),
      );
      if (res.ok) toast.success(id.export.downloaded, { id: toastId });
      else toast.error(res.error ?? id.export.failed, { id: toastId });
    } catch {
      toast.error(id.export.failed, { id: toastId });
    } finally {
      setBusy(false);
    }
  }

  if (zones.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        {id.export.noZones}
      </p>
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <label className="flex min-h-11 items-center gap-3 border-b pb-3 text-sm font-medium">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(v) =>
            setSelected(
              v === true ? new Set(zones.map((z) => z.id)) : new Set(),
            )
          }
        />
        {id.export.selectAll}
      </label>
      <ul className="space-y-1">
        {zones.map((z) => (
          <li key={z.id}>
            <label className="hover:bg-muted flex min-h-11 items-center gap-3 rounded-md px-1 text-sm">
              <Checkbox
                checked={selected.has(z.id)}
                onCheckedChange={(v) => toggle(z.id, v === true)}
              />
              <span className="min-w-0 flex-1 truncate">{z.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {z.total}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={onDownload}
          disabled={selected.size === 0 || busy}
        >
          {busy ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
          {id.export.downloadPdf}
        </Button>
        <span className="text-muted-foreground text-sm">
          {fmt(id.export.selected, { n: selected.size })}
        </span>
      </div>
    </div>
  );
}
