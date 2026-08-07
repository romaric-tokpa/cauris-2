import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, getSeed } from "@/lib/db";
import { resolveCycleContext } from "@/lib/cycle";
import { computeAnnualAnalysis } from "@/lib/pilot";
import type { SeedData } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** Analyse annuelle Janvier→Décembre : cumul des revenus/dépenses/catégories du cycle actif. */
export async function GET(req: Request) {
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

  const yearParam = new URL(req.url).searchParams.get("year");
  const year = yearParam ? Number(yearParam) : resolveCycleContext(seed as SeedData, state).M.year;

  return NextResponse.json(computeAnnualAnalysis(seed as SeedData, state, year));
}
