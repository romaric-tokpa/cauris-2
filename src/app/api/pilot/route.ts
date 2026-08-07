import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, getSeed } from "@/lib/db";
import { computePilot } from "@/lib/pilot";
import type { SeedData } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** Suivi mensuel : totaux et catégories par cycle. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [seed, rows] = await Promise.all([getSeed(), getAllState(session.userId)]);
  const state: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      state[row.key] = JSON.parse(row.value);
    } catch {
      state[row.key] = null;
    }
  }

  return NextResponse.json(computePilot(seed as SeedData, state));
}
