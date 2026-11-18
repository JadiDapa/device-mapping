import type { DeviceStatus } from "@/lib/status";

/**
 * Share of devices that are `tested`, as a whole percent (0 when the zone has
 * no devices). Counts come from the DB summary query, never from user input.
 */
export function testedPercent(
  counts: Record<DeviceStatus, number>,
  total: number,
): number {
  if (total <= 0) return 0;
  return Math.round((counts.tested / total) * 100);
}
