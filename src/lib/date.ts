import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { TZDate } from "@date-fns/tz";

export const APP_TIME_ZONE = "Asia/Jakarta";

/** `dd MMM yyyy HH:mm` in WIB (PRD §10), e.g. "06 Mar 2026 00:30 WIB". */
export function formatWib(value: Date | string | number): string {
  const date = new TZDate(new Date(value), APP_TIME_ZONE);
  return `${format(date, "dd MMM yyyy HH:mm", { locale: idLocale })} WIB`;
}
