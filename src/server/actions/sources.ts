"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import {
  networkSourceInputSchema,
  networkSourcePositionSchema,
} from "@/lib/validators/network-source";
import {
  createNetworkSource,
  deleteNetworkSource,
  moveNetworkSourcePosition,
  updateNetworkSource,
  type NetworkSource,
} from "@/server/network-sources";
import { ok, runAction, type ActionResult } from "./result";

// Every mutation: requireAdmin() first (guest => 403), then re-validate with
// the same Zod schema the client form used.

const uuid = z.string().uuid();

/** Sources show on zone maps, the all-zones map and the sources pages. */
function revalidateSources(...zoneIds: (string | null)[]) {
  revalidatePath("/map");
  revalidatePath("/network-sources");
  revalidatePath("/network-sources/[id]", "page");
  for (const zoneId of new Set(zoneIds)) {
    if (zoneId) revalidatePath(`/zones/${zoneId}`);
  }
}

export async function createNetworkSourceAction(
  input: unknown,
): Promise<ActionResult<{ source: NetworkSource }>> {
  return runAction(async () => {
    await requireAdmin();
    const parsed = networkSourceInputSchema.parse(input);
    const source = await createNetworkSource(getDb(), parsed);
    revalidateSources(source.zoneId);
    return ok({ source });
  });
}

export async function updateNetworkSourceAction(
  sourceId: string,
  input: unknown,
): Promise<ActionResult<{ source: NetworkSource }>> {
  return runAction(async () => {
    await requireAdmin();
    const parsed = networkSourceInputSchema.parse(input);
    const source = await updateNetworkSource(
      getDb(),
      uuid.parse(sourceId),
      parsed,
    );
    revalidateSources(source.zoneId);
    // Linked devices (any zone) display the source name/position.
    revalidatePath("/", "layout");
    return ok({ source });
  });
}

export async function moveNetworkSourcePositionAction(
  sourceId: string,
  input: unknown,
): Promise<ActionResult<{ source: NetworkSource }>> {
  return runAction(async () => {
    await requireAdmin();
    const parsed = networkSourcePositionSchema.parse(input);
    const source = await moveNetworkSourcePosition(
      getDb(),
      uuid.parse(sourceId),
      parsed,
    );
    revalidateSources(source.zoneId);
    revalidatePath("/", "layout");
    return ok({ source });
  });
}

export async function deleteNetworkSourceAction(
  sourceId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const source = await deleteNetworkSource(getDb(), uuid.parse(sourceId));
    revalidateSources(source.zoneId);
    // Devices in other zones lose their link too.
    revalidatePath("/", "layout");
    return ok();
  });
}
