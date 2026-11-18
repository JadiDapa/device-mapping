import { z } from "zod";
import { DEVICE_ICON_NAMES } from "@/lib/device-icons";
import { id } from "@/lib/i18n/id";

export const deviceTypeInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, id.deviceType.nameRequired)
    .max(100, id.deviceType.nameTooLong),
  icon: z.enum(DEVICE_ICON_NAMES, { error: id.deviceType.iconInvalid }),
  description: z
    .string()
    .trim()
    .max(1000, id.deviceType.descriptionTooLong)
    .nullish()
    .transform((v) => (v ? v : null)),
});

export type DeviceTypeFormValues = z.input<typeof deviceTypeInputSchema>;
export type DeviceTypeInput = z.output<typeof deviceTypeInputSchema>;
