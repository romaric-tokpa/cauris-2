import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, getSeed } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Hydratation initiale du client : renvoie le seed (cycle d'origine) et
 * toutes les entrées d'état de l'utilisateur (registre des cycles + buckets).
 * Le client mappe ces entrées sur ses clés localStorage puis démarre app.js.
 */
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

  return NextResponse.json({ seed, state });
}
