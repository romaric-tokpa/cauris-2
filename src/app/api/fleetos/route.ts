import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, getSeed } from "@/lib/db";
import { computeFleetos } from "@/lib/fleetos";
import type { SeedData } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** Plan d'autofinancement FleetOS (48 mois) vs épargne réelle du coffre « Projet FleetOS ». */
export async function GET() {
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
  return NextResponse.json(computeFleetos(seed as SeedData, state));
}
