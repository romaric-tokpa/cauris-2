import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, getSeed } from "@/lib/db";
import { computeDashboard } from "@/lib/dashboard";
import type { SeedData } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** KPI du tableau de bord, calculés côté serveur à partir du seed + de l'état utilisateur. */
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

  const dashboard = computeDashboard(seed as SeedData, state);
  return NextResponse.json(dashboard);
}
