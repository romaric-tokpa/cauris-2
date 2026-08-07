import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, getSeed, putState } from "@/lib/db";
import { computeCoffres } from "@/lib/coffres";
import { createCoffre } from "@/lib/cycle";
import type { SeedData } from "@/lib/seed";

export const dynamic = "force-dynamic";

async function loadState(userId: string): Promise<Record<string, unknown>> {
  const rows = await getAllState(userId);
  const state: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      state[row.key] = JSON.parse(row.value);
    } catch {
      state[row.key] = null;
    }
  }
  return state;
}

/** Coffres d'épargne et dettes à rembourser du cycle actif. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [seed, state] = await Promise.all([getSeed(), loadState(session.userId)]);
  return NextResponse.json(computeCoffres(seed as SeedData, state));
}

/** Crée un nouveau coffre d'épargne (compte associé + objectif). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { nom?: unknown; objectif?: unknown; bloque?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const [seed, state] = await Promise.all([getSeed(), loadState(session.userId)]);
  const result = createCoffre(seed as SeedData, state, {
    nom: String(body.nom ?? ""),
    objectif: Number(body.objectif ?? 0),
    bloque: Boolean(body.bloque),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const updatedAt = await putState(session.userId, "cycles", JSON.stringify(result.cycles));
  return NextResponse.json({ ok: true, updatedAt });
}
