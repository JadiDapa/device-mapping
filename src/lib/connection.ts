import { id } from "@/lib/i18n/id";
import type { ConnectionType } from "./connection-types";

export {
  CONNECTION_TYPES,
  DEFAULT_CONNECTION_TYPE,
  type ConnectionType,
} from "./connection-types";

export const connectionLabel: Record<ConnectionType, string> = {
  lan_poe: id.connection.lanPoe,
  fiber_optic: id.connection.fiberOptic,
  wifi: id.connection.wifi,
};
