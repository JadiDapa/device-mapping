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

export const statusColor: Record<DeviceStatus, string> = {
  not_installed: "#9CA3AF",
  partial: "#F59E0B",
  installed_untested: "#3B82F6",
  tested: "#16A34A",
};

/** Checklist components for a `partial` installation (PRD §4). */
export const PARTIAL_COMPONENTS = ["power", "fo", "ethernet"] as const;

export type PartialComponent = (typeof PARTIAL_COMPONENTS)[number];
