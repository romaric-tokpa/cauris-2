import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, getSeed, putState } from "@/lib/db";
import { createAccount } from "@/lib/cycle";
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

/** Crée un nouveau compte (Disponible / Épargne / Bloqué). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { nom?: unknown; type?: unknown; solde?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const [seed, state] = await Promise.all([getSeed(), loadState(session.userId)]);
  const result = createAccount(seed as SeedData, state, {
    nom: String(body.nom ?? ""),
    type: String(body.type ?? ""),
    solde: Number(body.solde ?? 0),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const updatedAt = await putState(session.userId, "cycles", JSON.stringify(result.cycles));
  return NextResponse.json({ ok: true, updatedAt });
}
