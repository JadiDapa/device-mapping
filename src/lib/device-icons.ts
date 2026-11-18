import {
  AntennaIcon,
  BluetoothIcon,
  CableIcon,
  CctvIcon,
  CpuIcon,
  GaugeIcon,
  LightbulbIcon,
  PlugIcon,
  RadarIcon,
  RadioIcon,
  RouterIcon,
  SatelliteDishIcon,
  ServerIcon,
  ThermometerIcon,
  WifiIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * Preset lucide icons an admin can pick for a device type (PRD §5). Only
 * these names are accepted (Zod enum) and bundled, so the whole lucide set
 * never ends up in the client.
 */
export const DEVICE_ICONS = {
  radio: RadioIcon,
  bluetooth: BluetoothIcon,
  wifi: WifiIcon,
  cpu: CpuIcon,
  antenna: AntennaIcon,
  server: ServerIcon,
  cctv: CctvIcon,
  radar: RadarIcon,
  "satellite-dish": SatelliteDishIcon,
  cable: CableIcon,
  plug: PlugIcon,
  zap: ZapIcon,
  lightbulb: LightbulbIcon,
  thermometer: ThermometerIcon,
  gauge: GaugeIcon,
} satisfies Record<string, LucideIcon>;

export type DeviceIconName = keyof typeof DEVICE_ICONS;

export const DEVICE_ICON_NAMES = Object.keys(DEVICE_ICONS) as [
  DeviceIconName,
  ...DeviceIconName[],
];

/** Router flag icon (PRD §3), fixed — not a device-type icon. */
export const RouterBadgeIcon = RouterIcon;

export function getDeviceIcon(name: string): LucideIcon {
  return (DEVICE_ICONS as Record<string, LucideIcon>)[name] ?? CpuIcon;
}
