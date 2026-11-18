import { createElement } from "react";
import {
  ArrowRightIcon,
  CameraIcon,
  NetworkIcon,
  RadioTowerIcon,
} from "lucide-react";
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

const ICON_PROPS = { size: 9, strokeWidth: 2.5, "aria-hidden": true } as const;
const ROUTER_ICON_PROPS = {
  size: 12,
  strokeWidth: 2.5,
  "aria-hidden": true,
} as const;
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
 * HTML for a device's `L.divIcon`: a numbered map pin filled with the status
 * colour (from lib/status.ts), an optional router badge (top-right), type-icon
 * badge (bottom-left) and location label (below). Every other colour comes
 * from CSS variables in globals.css (`.device-marker*`).
 */
export function buildMarkerHtml(m: MarkerHtmlInput): string {
  const parts = [
    `<span class="device-marker__dot" aria-hidden="true"></span>`,
    `<span class="device-marker__num" aria-hidden="true">${m.seq}</span>`,
  ];
  if (m.isRouter) {
    parts.push(
      `<span class="device-marker__badge device-marker__badge--router" aria-hidden="true">${svg(
        "router",
        () => createElement(RouterBadgeIcon, ROUTER_ICON_PROPS),
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
  const cls = [
    "device-marker",
    m.isRouter && "device-marker--router",
    m.selected && "device-marker--selected",
    m.status === "partial" && "device-marker--partial",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    `<div class="${cls}" data-testid="device-marker" data-seq="${m.seq}" ` +
    `data-status="${m.status}" data-label="${escapeHtml(statusLabel[m.status])}" ` +
    `style="--marker-color:${statusColor[m.status]}">${parts.join("")}</div>`
  );
}

export type ExtenderMarkerHtmlInput = { label: string; selected: boolean };

/**
 * HTML for an extender's `L.divIcon`: the same pin as a device, in the
 * neutral extender colour, with the connection label ("5→6") instead of a
 * seq number. Longer labels shrink so they stay inside the pin.
 */
export function buildExtenderMarkerHtml(m: ExtenderMarkerHtmlInput): string {
  const [from = "?", to = "?"] = m.label.split("→");
  // Size by digit count only; the arrow is a compact icon, not a glyph.
  const digits = from.length + to.length;
  const len = digits <= 2 ? "s" : digits <= 4 ? "m" : "l";
  const arrow = svg("extender-arrow", () =>
    createElement(ArrowRightIcon, {
      size: 9,
      strokeWidth: 3,
      "aria-hidden": true,
    }),
  );
  const badge = svg("extender", () =>
    createElement(RadioTowerIcon, ROUTER_ICON_PROPS),
  );
  const cls = m.selected
    ? "device-marker device-marker--extender device-marker--selected"
    : "device-marker device-marker--extender";
  return (
    `<div class="${cls}" data-testid="extender-marker" data-label="${escapeHtml(m.label)}">` +
    `<span class="device-marker__dot" aria-hidden="true"></span>` +
    `<span class="device-marker__num" data-len="${len}" aria-hidden="true">` +
    `<span>${escapeHtml(from)}</span>${arrow}<span>${escapeHtml(to)}</span></span>` +
    `<span class="device-marker__badge device-marker__badge--extender" aria-hidden="true">${badge}</span></div>`
  );
}

export type CameraMarkerHtmlInput = {
  name: string;
  count: number;
  selected: boolean;
};

/**
 * HTML for a camera point's `L.divIcon`: the same pin in the neutral colour
 * with a camera glyph, plus a photo-count badge (so it is told apart from
 * devices and extenders by icon and badge, not only by colour).
 */
export function buildCameraMarkerHtml(m: CameraMarkerHtmlInput): string {
  const glyph = svg("camera", () =>
    createElement(CameraIcon, {
      size: 16,
      strokeWidth: 2.25,
      "aria-hidden": true,
    }),
  );
  const cls = m.selected
    ? "device-marker device-marker--camera device-marker--selected"
    : "device-marker device-marker--camera";
  return (
    `<div class="${cls}" data-testid="camera-marker" data-name="${escapeHtml(m.name)}" data-count="${m.count}">` +
    `<span class="device-marker__dot" aria-hidden="true"></span>` +
    `<span class="device-marker__num" aria-hidden="true">${glyph}</span>` +
    `<span class="device-marker__badge device-marker__badge--count" aria-hidden="true">${m.count}</span></div>`
  );
}

export type SourceMarkerHtmlInput = { name: string; selected: boolean };

/**
 * HTML for a network source's `L.divIcon`: a rounded square (different shape
 * from the round device markers) with a always-visible name label below.
 * Colours come from the `--map-source-*` tokens in globals.css.
 */
export function buildSourceMarkerHtml(m: SourceMarkerHtmlInput): string {
  const icon = svg("source", () =>
    createElement(NetworkIcon, {
      size: 16,
      strokeWidth: 2.25,
      "aria-hidden": true,
    }),
  );
  const cls = m.selected
    ? "source-marker source-marker--selected"
    : "source-marker";
  return (
    `<div class="${cls}" data-testid="source-marker" data-name="${escapeHtml(m.name)}">` +
    `<span class="source-marker__box" aria-hidden="true">${icon}</span>` +
    `<span class="source-marker__label">${escapeHtml(m.name)}</span></div>`
  );
}
