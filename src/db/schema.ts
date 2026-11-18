/**
 * Application data model (PRD §5). The Better Auth tables live in
 * ./auth-schema.ts and are re-exported here so a single `schema` object can be
 * handed to both drizzle() and the Better Auth adapter.
 *
 * `devices (zone_id, seq)` uniqueness is intentionally NOT declared here: it
 * must be DEFERRABLE INITIALLY DEFERRED so a renumber can swap seq values
 * inside one transaction, and drizzle-kit cannot express that. It is added by
 * the custom migration `*_devices_seq_deferrable.sql` as constraint
 * `devices_zone_seq_unique`.
 *
 * Run `npm run db:generate` after changing this file, `npm run db:migrate` to
 * apply.
 */
import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { DEVICE_STATUSES } from "../lib/status";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const deviceStatus = pgEnum("device_status", DEVICE_STATUSES);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export const zones = pgTable("zones", {
  id: id(),
  name: text("name").notNull().unique(),
  description: text("description"),
  boundary: jsonb("boundary").$type<GeoJsonPolygon>(),
  centerLat: doublePrecision("center_lat"),
  centerLng: doublePrecision("center_lng"),
  defaultZoom: integer("default_zoom"),
  createdBy: uuid("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const deviceTypes = pgTable("device_types", {
  id: id(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull(),
  description: text("description"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const networkSources = pgTable("network_sources", {
  id: id(),
  zoneId: uuid("zone_id").references(() => zones.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  description: text("description"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const devices = pgTable(
  "devices",
  {
    id: id(),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => zones.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    deviceTypeId: uuid("device_type_id")
      .notNull()
      .references(() => deviceTypes.id),
    isRouter: boolean("is_router").default(false).notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    locationDetail: text("location_detail"),
    notes: text("notes"),
    status: deviceStatus("status").default("not_installed").notNull(),
    hasPower: boolean("has_power").default(false).notNull(),
    hasFo: boolean("has_fo").default(false).notNull(),
    hasEthernet: boolean("has_ethernet").default(false).notNull(),
    partialNote: text("partial_note"),
    networkSourceId: uuid("network_source_id").references(
      () => networkSources.id,
      { onDelete: "set null" },
    ),
    /** Router+BLE this device hangs off (chain: source -> router -> device). */
    parentDeviceId: uuid("parent_device_id").references(
      (): AnyPgColumn => devices.id,
      { onDelete: "set null" },
    ),
    updatedBy: uuid("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("devices_zone_id_idx").on(t.zoneId),
    index("devices_parent_device_id_idx").on(t.parentDeviceId),
    index("devices_network_source_id_idx").on(t.networkSourceId),
  ],
);

export type StatusSnapshot = {
  has_power: boolean;
  has_fo: boolean;
  has_ethernet: boolean;
  partial_note: string | null;
};

export const deviceStatusHistory = pgTable(
  "device_status_history",
  {
    id: id(),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    fromStatus: deviceStatus("from_status"),
    toStatus: deviceStatus("to_status").notNull(),
    snapshot: jsonb("snapshot").$type<StatusSnapshot>().notNull(),
    note: text("note"),
    changedBy: uuid("changed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("device_status_history_device_changed_idx").on(
      t.deviceId,
      t.changedAt,
    ),
  ],
);

export const zonesRelations = relations(zones, ({ many, one }) => ({
  devices: many(devices),
  networkSources: many(networkSources),
  creator: one(user, { fields: [zones.createdBy], references: [user.id] }),
}));

export const deviceTypesRelations = relations(deviceTypes, ({ many }) => ({
  devices: many(devices),
}));

export const networkSourcesRelations = relations(
  networkSources,
  ({ many, one }) => ({
    zone: one(zones, {
      fields: [networkSources.zoneId],
      references: [zones.id],
    }),
    devices: many(devices),
  }),
);

export const devicesRelations = relations(devices, ({ many, one }) => ({
  zone: one(zones, { fields: [devices.zoneId], references: [zones.id] }),
  deviceType: one(deviceTypes, {
    fields: [devices.deviceTypeId],
    references: [deviceTypes.id],
  }),
  networkSource: one(networkSources, {
    fields: [devices.networkSourceId],
    references: [networkSources.id],
  }),
  updater: one(user, { fields: [devices.updatedBy], references: [user.id] }),
  history: many(deviceStatusHistory),
}));

export const deviceStatusHistoryRelations = relations(
  deviceStatusHistory,
  ({ one }) => ({
    device: one(devices, {
      fields: [deviceStatusHistory.deviceId],
      references: [devices.id],
    }),
    changer: one(user, {
      fields: [deviceStatusHistory.changedBy],
      references: [user.id],
    }),
  }),
);
