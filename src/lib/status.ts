import { id } from "./i18n/id";

/**
 * Single source of truth for installation status (PRD §4): enum values,
 * labels and marker colours. Markers, legend, badges, charts and exports all
 * read from here — never hardcode a status colour elsewhere.
 */
export const DEVICE_STATUSES = [
  "not_installed",
  "partial",
  "installed_untested",
  "tested",
] as const;

export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export const statusLabel: Record<DeviceStatus, string> = {
  not_installed: id.status.not_installed,
  partial: id.status.partial,
  installed_untested: id.status.installed_untested,
  tested: id.status.tested,
};

/** CSS variable references (tokens in globals.css, PRD-M8 §1.1 D). */
export const statusColor: Record<DeviceStatus, string> = {
  not_installed: "var(--status-not-installed)",
  partial: "var(--status-partial)",
  installed_untested: "var(--status-installed-untested)",
  tested: "var(--status-tested)",
};

/** Checklist components for a `partial` installation (PRD §4). */
export const PARTIAL_COMPONENTS = ["power", "fo", "ethernet"] as const;

export type PartialComponent = (typeof PARTIAL_COMPONENTS)[number];
