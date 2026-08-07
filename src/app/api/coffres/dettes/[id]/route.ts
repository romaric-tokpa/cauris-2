import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, getSeed, putState } from "@/lib/db";
import { setDettePaid } from "@/lib/coffres";
import type { SeedData } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** Marque (ou démarque) une dette payée. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  let body: { paid?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

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

  const result = setDettePaid(seed as SeedData, state, id, Boolean(body.paid));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const updatedAt = await putState(session.userId, `m-${result.cycleId}`, JSON.stringify(result.updatedBucket));
  return NextResponse.json({ ok: true, updatedAt });
}
