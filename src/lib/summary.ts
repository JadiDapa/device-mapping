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

type Summarised = {
  total: number;
  routers: number;
  counts: Record<DeviceStatus, number>;
};

/**
 * Combined totals over several zone summaries (cover page of the PDF). The
 * inputs are the per-zone GROUP BY results; this only adds them up.
 */
export function sumSummaries(list: Summarised[]): Summarised {
  const sum: Summarised = {
    total: 0,
    routers: 0,
    counts: {
      not_installed: 0,
      partial: 0,
      installed_untested: 0,
      tested: 0,
    },
  };
  for (const s of list) {
    sum.total += s.total;
    sum.routers += s.routers;
    for (const k of Object.keys(sum.counts) as DeviceStatus[]) {
      sum.counts[k] += s.counts[k];
    }
  }
  return sum;
}
