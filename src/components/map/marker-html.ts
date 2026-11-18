import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getDeviceIcon, RouterBadgeIcon } from "@/lib/device-icons";
import { statusColor, statusLabel, type DeviceStatus } from "@/lib/status";

export type MarkerHtmlInput = {
  seq: number;
  status: DeviceStatus;
  isRouter: boolean;
  typeIcon: string;
  locationDetail: string | null;
  selected: boolean;
  showLocation: boolean;
  showTypeIcon: boolean;
};

const ICON_PROPS = { size: 11, strokeWidth: 2.5, "aria-hidden": true } as const;
const svgCache = new Map<string, string>();

function svg(key: string, make: () => React.ReactElement): string {
  let html = svgCache.get(key);
  if (html === undefined) {
    html = renderToStaticMarkup(make());
    svgCache.set(key, html);
  }
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * HTML for a device's `L.divIcon`: a numbered circle filled with the status
 * colour (from lib/status.ts), an optional router badge (top-right), type-icon
 * badge (bottom-left) and location label (below). Every other colour comes
 * from CSS variables in globals.css (`.device-marker*`).
 */
export function buildMarkerHtml(m: MarkerHtmlInput): string {
  const parts = [
    `<span class="device-marker__dot" aria-hidden="true">${m.seq}</span>`,
  ];
  if (m.isRouter) {
    parts.push(
      `<span class="device-marker__badge device-marker__badge--router" aria-hidden="true">${svg(
        "router",
        () => createElement(RouterBadgeIcon, ICON_PROPS),
      )}</span>`,
    );
  }
  if (m.showTypeIcon) {
    parts.push(
      `<span class="device-marker__badge device-marker__badge--type" aria-hidden="true">${svg(
        `type:${m.typeIcon}`,
        () => createElement(getDeviceIcon(m.typeIcon), ICON_PROPS),
      )}</span>`,
    );
  }
  if (m.showLocation && m.locationDetail) {
    parts.push(
      `<span class="device-marker__label">${escapeHtml(m.locationDetail)}</span>`,
    );
  }
  const cls = m.selected
    ? "device-marker device-marker--selected"
    : "device-marker";
  return (
    `<div class="${cls}" data-testid="device-marker" data-seq="${m.seq}" ` +
    `data-status="${m.status}" data-label="${escapeHtml(statusLabel[m.status])}" ` +
    `style="--marker-color:${statusColor[m.status]}">${parts.join("")}</div>`
  );
}
