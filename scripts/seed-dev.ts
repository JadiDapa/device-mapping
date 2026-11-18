/**
 * Sample data for local development: zones Pusri 1B and Pusri 2B with
 * polygons, one network source each, and six numbered devices per zone in a
 * mix of statuses (with routers and a partial checklist), each with a status
 * history trail. Idempotent: a zone that already exists (by name) is skipped.
 *
 * The geometry is laid out around NEXT_PUBLIC_DEFAULT_CENTER_*; it is sample
 * data, not the real plant layout.
 */
import { pathToFileURL } from "node:url";
import { inArray } from "drizzle-orm";
import type { Database } from "@/db";
import { seedDeviceTypes } from "@/db/seed";
import {
  deviceStatusHistory,
  devices,
  deviceTypes,
  networkSources,
  zones,
  type GeoJsonPolygon,
} from "@/db/schema";
import { publicEnv } from "@/lib/public-env";
import type { DeviceStatus } from "@/lib/status";

type Box = { lat0: number; lat1: number; lng0: number; lng1: number };

function polygonOf(box: Box): GeoJsonPolygon {
  const { lat0, lat1, lng0, lng1 } = box;
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng0, lat0],
        [lng1, lat0],
        [lng1, lat1],
        [lng0, lat1],
        [lng0, lat0],
      ],
    ],
  };
}

/** Point at fractions (fx, fy) in 0..1 of the box. */
function at(box: Box, fx: number, fy: number) {
  return {
    lng: box.lng0 + (box.lng1 - box.lng0) * fx,
    lat: box.lat0 + (box.lat1 - box.lat0) * fy,
  };
}

/** Status path a device went through, oldest first. */
const PATH: Record<DeviceStatus, DeviceStatus[]> = {
  not_installed: ["not_installed"],
  partial: ["not_installed", "partial"],
  installed_untested: ["not_installed", "partial", "installed_untested"],
  tested: ["not_installed", "installed_untested", "tested"],
};

type SeedDevice = {
  type: "Gateway" | "BLE Receiver";
  isRouter: boolean;
  fx: number;
  fy: number;
  locationDetail: string;
  status: DeviceStatus;
  power?: boolean;
  fo?: boolean;
  ethernet?: boolean;
  partialNote?: string;
  withSource?: boolean;
};

const DEVICES: SeedDevice[] = [
  {
    type: "Gateway",
    isRouter: true,
    fx: 0.2,
    fy: 0.25,
    locationDetail: "Lantai 1",
    status: "tested",
    withSource: true,
  },
  {
    type: "BLE Receiver",
    isRouter: false,
    fx: 0.4,
    fy: 0.3,
    locationDetail: "Lantai 1 Lorong Kiri",
    status: "tested",
    withSource: true,
  },
  {
    type: "BLE Receiver",
    isRouter: false,
    fx: 0.6,
    fy: 0.35,
    locationDetail: "Lantai 2",
    status: "installed_untested",
  },
  {
    type: "Gateway",
    isRouter: true,
    fx: 0.75,
    fy: 0.55,
    locationDetail: "Tangga Lantai 3",
    status: "partial",
    power: true,
    ethernet: true,
    partialNote: "FO belum ditarik",
    withSource: true,
  },
  {
    type: "BLE Receiver",
    isRouter: false,
    fx: 0.5,
    fy: 0.7,
    locationDetail: "Lantai 2 Lorong Kanan",
    status: "not_installed",
  },
  {
    type: "BLE Receiver",
    isRouter: false,
    fx: 0.25,
    fy: 0.75,
    locationDetail: "Lantai 1 Belakang",
    status: "not_installed",
  },
];

const ZONE_SPECS = [
  {
    name: "Pusri 1B",
    description: "Area pabrik Pusri 1B (data contoh).",
    box: (c: { lat: number; lng: number }): Box => ({
      lat0: c.lat - 0.001,
      lat1: c.lat + 0.001,
      lng0: c.lng - 0.003,
      lng1: c.lng - 0.0004,
    }),
    source: { name: "Shelter Utilitas P1B", kind: "Shelter", fx: 0.1, fy: 0.5 },
  },
  {
    name: "Pusri 2B",
    description: "Area pabrik Pusri 2B (data contoh).",
    box: (c: { lat: number; lng: number }): Box => ({
      lat0: c.lat - 0.001,
      lat1: c.lat + 0.001,
      lng0: c.lng + 0.0004,
      lng1: c.lng + 0.003,
    }),
    source: {
      name: "Control Room P2B",
      kind: "Control Room",
      fx: 0.9,
      fy: 0.5,
    },
  },
];

export async function seedDev(db: Database): Promise<{ zonesCreated: number }> {
  await seedDeviceTypes(db);
  const center = publicEnv.defaultCenter;
  let zonesCreated = 0;

  await db.transaction(async (tx) => {
    const typeRows = await tx
      .select()
      .from(deviceTypes)
      .where(inArray(deviceTypes.name, ["Gateway", "BLE Receiver"]));
    const typeId = Object.fromEntries(typeRows.map((t) => [t.name, t.id]));

    const existing = new Set(
      (await tx.select({ name: zones.name }).from(zones)).map((z) => z.name),
    );

    for (const spec of ZONE_SPECS) {
      if (existing.has(spec.name)) continue;
      const box = spec.box(center);
      const mid = at(box, 0.5, 0.5);

      const [zone] = await tx
        .insert(zones)
        .values({
          name: spec.name,
          description: spec.description,
          boundary: polygonOf(box),
          centerLat: mid.lat,
          centerLng: mid.lng,
          defaultZoom: publicEnv.defaultZoom,
        })
        .returning({ id: zones.id });

      const sp = at(box, spec.source.fx, spec.source.fy);
      const [source] = await tx
        .insert(networkSources)
        .values({
          zoneId: zone!.id,
          name: spec.source.name,
          kind: spec.source.kind,
          lat: sp.lat,
          lng: sp.lng,
        })
        .returning({ id: networkSources.id });

      for (const [index, d] of DEVICES.entries()) {
        const p = at(box, d.fx, d.fy);
        const installed =
          d.status === "installed_untested" || d.status === "tested";
        const checklist = {
          hasPower: installed || (d.power ?? false),
          hasFo: installed || (d.fo ?? false),
          hasEthernet: installed || (d.ethernet ?? false),
          partialNote: d.partialNote ?? null,
        };

        const [device] = await tx
          .insert(devices)
          .values({
            zoneId: zone!.id,
            seq: index + 1,
            deviceTypeId: typeId[d.type]!,
            isRouter: d.isRouter,
            lat: p.lat,
            lng: p.lng,
            locationDetail: d.locationDetail,
            status: d.status,
            ...checklist,
            networkSourceId: d.withSource ? source!.id : null,
          })
          .returning({ id: devices.id });

        // One history row per stage; the first has from_status = null
        // (creation) and the last matches the device's current status.
        const steps = PATH[d.status];
        const now = Date.now();
        await tx.insert(deviceStatusHistory).values(
          steps.map((to, i) => {
            const isLast = i === steps.length - 1;
            const isPartialStep = to === "partial";
            return {
              deviceId: device!.id,
              fromStatus: i === 0 ? null : steps[i - 1]!,
              toStatus: to,
              snapshot: {
                has_power: isLast || isPartialStep ? checklist.hasPower : false,
                has_fo: isLast || isPartialStep ? checklist.hasFo : false,
                has_ethernet:
                  isLast || isPartialStep ? checklist.hasEthernet : false,
                partial_note:
                  isPartialStep || isLast ? checklist.partialNote : null,
              },
              note: i === 0 ? "Data contoh (seed:dev)" : null,
              changedAt: new Date(now - (steps.length - i) * 86_400_000),
            };
          }),
        );
      }
      zonesCreated += 1;
    }
  });

  return { zonesCreated };
}

async function main() {
  const { getEnv } = await import("@/lib/env");
  const { closeDb, getDb } = await import("@/db");
  getEnv();
  try {
    const { zonesCreated } = await seedDev(getDb());
    console.log(
      zonesCreated > 0
        ? `Dev data seeded: ${zonesCreated} zone(s) created.`
        : "Dev data already present, skipping.",
    );
  } finally {
    await closeDb();
  }
}

// Only run as a script, not when imported by tests.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error("Dev seed failed:", error);
    process.exit(1);
  });
}
