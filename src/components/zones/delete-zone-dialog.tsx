"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { id } from "@/lib/i18n/id";
import { deleteZoneAction } from "@/server/actions/zones";

/** Deleting a zone (and all its devices) requires typing the zone's name. */
export function DeleteZoneDialog({
  zoneId,
  zoneName,
}: {
  zoneId: string;
  zoneName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const matches = typed === zoneName;

  async function confirm() {
    setPending(true);
    const res = await deleteZoneAction(zoneId, typed);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(id.zone.deleted);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTyped("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">{id.zone.deleteConfirmAction}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{id.zone.deleteConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {id.zone.dangerDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label htmlFor="confirm-zone-name" className="text-sm">
            {id.zone.deleteConfirmPrompt}{" "}
            <strong className="font-semibold">{zoneName}</strong>
          </label>
          <Input
            id="confirm-zone-name"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {id.common.cancel}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!matches || pending}
            onClick={confirm}
          >
            {id.zone.deleteConfirmAction}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
