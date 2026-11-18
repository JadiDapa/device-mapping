"use client";

import { useState } from "react";
import { FileArchiveIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/download";
import { zipFilename } from "@/lib/export-filename";
import { id } from "@/lib/i18n/id";

/** "Unduh foto (ZIP)": every camera photo of the zone (admin only). */
export function CameraZipButton({
  zoneId,
  zoneName,
  photoCount,
}: {
  zoneId: string;
  zoneName: string;
  photoCount: number;
}) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    const toastId = toast.loading(id.export.preparing);
    try {
      const res = await downloadFile(
        `/api/export/camera-zip?zone=${encodeURIComponent(zoneId)}`,
        zipFilename(zoneName),
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
      disabled={busy || photoCount === 0}
      title={photoCount === 0 ? id.camera.zipEmpty : undefined}
    >
      {busy ? <Loader2Icon className="animate-spin" /> : <FileArchiveIcon />}
      {id.camera.zipDownload}
    </Button>
  );
}
