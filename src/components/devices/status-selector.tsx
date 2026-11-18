"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { id } from "@/lib/i18n/id";
import type { DeviceStatus } from "@/lib/status";
import { PARTIAL_COMPONENTS } from "@/lib/status";
import {
  deviceStatusSchema,
  type DeviceStatusInput,
} from "@/lib/validators/device";
import { PartialFields, type PartialValue } from "./partial-fields";
import { StatusBadge } from "./status-badge";
import { StatusSegmented } from "./status-segmented";

type StatusDevice = {
  status: DeviceStatus;
  hasPower: boolean;
  hasFo: boolean;
  hasEthernet: boolean;
  partialNote: string | null;
  updatedAt: Date;
};

const FIELD = {
  power: "hasPower",
  fo: "hasFo",
  ethernet: "hasEthernet",
} as const;

/**
 * Quick status change (PRD F4). Picking a status applies it at once; picking
 * "partial" first reveals the Power/FO/Ethernet checklist + note and applies
 * on "Simpan status". Guests only see the current status (read-only).
 *
 * The parent re-mounts this (via `key`) whenever the saved status/checklist
 * changes, so the local draft always starts from the saved values.
 */
export function StatusSelector({
  device,
  canEdit,
  onApply,
}: {
  device: StatusDevice;
  canEdit: boolean;
  /** Resolves true when the change was saved. */
  onApply: (input: DeviceStatusInput) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<DeviceStatus>(device.status);
  const [partial, setPartial] = useState<PartialValue>({
    hasPower: device.hasPower,
    hasFo: device.hasFo,
    hasEthernet: device.hasEthernet,
    partialNote: device.partialNote ?? "",
  });
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function apply(status: DeviceStatus) {
    const parsed = deviceStatusSchema.safeParse({
      status,
      ...partial,
      note,
      expectedUpdatedAt: device.updatedAt.toISOString(),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? id.common.genericError);
      return;
    }
    setError(null);
    setBusy(true);
    const saved = await onApply(parsed.data);
    setBusy(false);
    if (saved) setNote("");
  }

  if (!canEdit) {
    return (
      <div className="space-y-2">
        <StatusBadge status={device.status} />
        {device.status === "partial" && (
          <ul className="text-muted-foreground space-y-0.5 text-sm">
            {PARTIAL_COMPONENTS.map((c) => (
              <li key={c}>
                {id.partialComponent[c]}:{" "}
                {device[FIELD[c]]
                  ? id.statusChange.installed
                  : id.statusChange.notInstalledYet}
              </li>
            ))}
            {device.partialNote && <li>{device.partialNote}</li>}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <StatusSegmented
        label={id.statusChange.statusGroup}
        value={draft}
        disabled={busy}
        onChange={(s) => {
          setDraft(s);
          setError(null);
          // Partial needs the checklist first; every other status is one click.
          if (s !== "partial" && s !== device.status) void apply(s);
        }}
      />
      {draft === "partial" && (
        <PartialFields
          value={partial}
          onChange={(patch) => setPartial((p) => ({ ...p, ...patch }))}
          error={error}
          disabled={busy}
        />
      )}
      <div className="space-y-1.5">
        <label htmlFor="status-change-note" className="text-sm">
          {id.statusChange.note}
        </label>
        <Input
          id="status-change-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={id.statusChange.notePlaceholder}
          disabled={busy}
        />
      </div>
      {draft === "partial" && (
        <Button
          type="button"
          onClick={() => void apply("partial")}
          disabled={busy}
        >
          {id.statusChange.apply}
        </Button>
      )}
    </div>
  );
}
