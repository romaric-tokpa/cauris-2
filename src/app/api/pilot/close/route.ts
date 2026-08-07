import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, getSeed, putState } from "@/lib/db";
import { closeActiveCycle } from "@/lib/pilot";
import type { SeedData } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** Clôture le cycle actif et démarre le suivant (soldes reportés). */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await getAllState(session.userId);
  const state: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      state[row.key] = JSON.parse(row.value);
    } catch {
      state[row.key] = null;
    }
  }
  const seed = await getSeed();

  const result = closeActiveCycle(seed as SeedData, state);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const writes = [putState(session.userId, "cycles", JSON.stringify(result.cycles))];
  if (result.newBucket) writes.push(putState(session.userId, `m-${result.newCycleId}`, JSON.stringify(result.newBucket)));
  await Promise.all(writes);

  return NextResponse.json({ ok: true, cycleId: result.newCycleId, alreadyExists: result.alreadyExists });
}
