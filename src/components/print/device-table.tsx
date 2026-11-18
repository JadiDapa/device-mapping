import { StatusBadge } from "@/components/devices/status-badge";
import { formatWib } from "@/lib/date";
import { id } from "@/lib/i18n/id";
import { partialDetail } from "@/lib/partial-detail";
import type { ZoneDevice } from "@/server/devices";

/**
 * Device table for the PDF (PRD F7): No, Tipe, Router, Lokasi Detail, Status,
 * Detail Partial, Sumber Jaringan, Catatan, Terakhir diubah. The status cell
 * is a labelled badge, never colour alone.
 */
export function DeviceTable({
  devices,
  sourceNames,
}: {
  devices: ZoneDevice[];
  /** network source id -> name */
  sourceNames: Map<string, string>;
}) {
  const col = id.export.col;
  return (
    <table className="w-full border-collapse text-[11px]">
      <thead className="table-header-group">
        <tr className="bg-muted text-left">
          {[
            col.seq,
            col.type,
            col.router,
            col.location,
            col.status,
            col.partial,
            col.source,
            col.notes,
            col.updated,
          ].map((h) => (
            <th key={h} className="border px-2 py-1 font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {devices.map((d) => (
          <tr key={d.id} className="break-inside-avoid align-top">
            <td className="border px-2 py-1 font-semibold tabular-nums">
              {d.seq}
            </td>
            <td className="border px-2 py-1">{d.typeName}</td>
            <td className="border px-2 py-1">
              {d.isRouter ? id.export.yes : id.export.no}
            </td>
            <td className="border px-2 py-1">{d.locationDetail ?? "—"}</td>
            <td className="border px-2 py-1 whitespace-nowrap">
              <StatusBadge status={d.status} className="text-[11px]" />
            </td>
            <td className="border px-2 py-1">{partialDetail(d) ?? "—"}</td>
            <td className="border px-2 py-1">
              {(d.networkSourceId && sourceNames.get(d.networkSourceId)) || "—"}
            </td>
            <td className="border px-2 py-1 whitespace-pre-wrap">
              {d.notes ?? "—"}
            </td>
            <td className="border px-2 py-1 whitespace-nowrap">
              {formatWib(d.updatedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
