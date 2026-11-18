"use client";

import { useEffect, useState } from "react";
import { formatWib } from "@/lib/date";
import { id } from "@/lib/i18n/id";
import { getDeviceHistoryAction } from "@/server/actions/devices";
import type { DeviceHistoryEntry } from "@/server/devices";
import { StatusBadge } from "./status-badge";

/**
 * Status history tab. Loads on mount and again whenever `version` changes
 * (the device was saved), newest first. Times are WIB.
 */
export function DeviceHistory({
  deviceId,
  version,
}: {
  deviceId: string;
  version: string;
}) {
  const [entries, setEntries] = useState<DeviceHistoryEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDeviceHistoryAction(deviceId).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setEntries(res.data.history);
        setFailed(false);
      } else {
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [deviceId, version]);

  if (failed) {
    return <p className="text-destructive text-sm">{id.history.failed}</p>;
  }
  if (entries === null) {
    return (
      <p className="text-muted-foreground text-sm">{id.history.loading}</p>
    );
  }
  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm">{id.history.empty}</p>;
  }

  return (
    <ol className="space-y-3" data-testid="device-history">
      {entries.map((h) => (
        <li
          key={h.id}
          data-testid="history-entry"
          className="space-y-1 rounded-md border p-3 text-sm"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {h.fromStatus ? (
              <>
                <StatusBadge status={h.fromStatus} />
                <span aria-hidden>→</span>
              </>
            ) : (
              <span className="text-muted-foreground">
                {id.history.created}
              </span>
            )}
            <StatusBadge status={h.toStatus} />
          </div>
          <div className="text-muted-foreground text-xs">
            {formatWib(h.changedAt)} · {id.history.by}{" "}
            {h.changedByName ?? id.history.unknownUser}
          </div>
          {h.note && <p>{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}
