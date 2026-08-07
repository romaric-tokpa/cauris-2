import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, putState } from "@/lib/db";
import { switchActiveCycle } from "@/lib/pilot";

export const dynamic = "force-dynamic";

/** Change le cycle actif (consultation/saisie sur un cycle existant) sans le clôturer. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const cycleId = typeof body.cycleId === "string" ? body.cycleId : "";

  const rows = await getAllState(session.userId);
  const state: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      state[row.key] = JSON.parse(row.value);
    } catch {
      state[row.key] = null;
    }
  }

  const result = switchActiveCycle(state, cycleId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await putState(session.userId, "cycles", JSON.stringify(result.cycles));
  return NextResponse.json({ ok: true });
}
