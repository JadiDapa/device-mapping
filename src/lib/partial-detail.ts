import { id } from "@/lib/i18n/id";
import type { DeviceStatus } from "@/lib/status";

type PartialFields = {
  status: DeviceStatus;
  hasPower: boolean;
  hasFo: boolean;
  hasEthernet: boolean;
  partialNote: string | null;
};

/**
 * "Detail Partial" column of the PDF table: the installed components plus the
 * free note. Only meaningful for `partial`; for other statuses the stored
 * checklist is kept but not shown (PRD §4), so this returns null.
 */
export function partialDetail(d: PartialFields): string | null {
  if (d.status !== "partial") return null;
  const parts: string[] = [];
  if (d.hasPower) parts.push(id.partialComponent.power);
  if (d.hasFo) parts.push(id.partialComponent.fo);
  if (d.hasEthernet) parts.push(id.partialComponent.ethernet);
  const components = parts.join(", ");
  const note = d.partialNote?.trim();
  if (components && note) return `${components} — ${note}`;
  return components || note || null;
}
