"use client";

import { useState } from "react";
import { DownloadIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/download";
import { pngFilename } from "@/lib/export-filename";
import { id } from "@/lib/i18n/id";

/** "Export PNG" on the zone page (any role, guests included). */
export function ExportPngButton({
  zoneId,
  zoneName,
}: {
  zoneId: string;
  zoneName: string;
}) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    const toastId = toast.loading(id.export.preparing);
    try {
      const res = await downloadFile(
        `/api/export/png?zone=${encodeURIComponent(zoneId)}`,
        pngFilename(zoneName),
      );
      if (res.ok) toast.success(id.export.downloaded, { id: toastId });
      else toast.error(res.error ?? id.export.failed, { id: toastId });
    } catch {
      toast.error(id.export.failed, { id: toastId });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={busy}
    >
      {busy ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
      {id.export.downloadPng}
    </Button>
  );
}
