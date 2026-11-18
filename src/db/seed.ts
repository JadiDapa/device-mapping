import type { Database } from "@/db";
import { deviceTypes } from "./schema";

/** Default device types (PRD F5). Idempotent; never overwrites admin edits. */
export const DEFAULT_DEVICE_TYPES = [
  { name: "Gateway", icon: "radio" },
  { name: "BLE Receiver", icon: "bluetooth" },
  { name: "CCTV", icon: "cctv" },
] as const;

export async function seedDeviceTypes(db: Database): Promise<void> {
  await db
    .insert(deviceTypes)
    .values(DEFAULT_DEVICE_TYPES.map((t) => ({ ...t })))
    .onConflictDoNothing({ target: deviceTypes.name });
}
