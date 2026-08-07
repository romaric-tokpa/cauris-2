import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, getSeed, putState } from "@/lib/db";
import { computePret, markEcheancePaid, unmarkEcheance } from "@/lib/pret";
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

/** Prêt étudiant : infos, échéancier, statut de chaque échéance. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [seed, state] = await Promise.all([getSeed(), loadState(session.userId)]);
  return NextResponse.json(computePret(seed as SeedData, state));
}

/** Marque une échéance payée : crée l'opération de dépense correspondante. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { no?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const no = Number(body.no);
  if (!Number.isFinite(no)) return NextResponse.json({ error: "bad_no" }, { status: 400 });

  const [seed, state] = await Promise.all([getSeed(), loadState(session.userId)]);
  const result = markEcheancePaid(seed as SeedData, state, no);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const updatedAt = await putState(session.userId, `m-${result.cycleId}`, JSON.stringify(result.updatedBucket));
  return NextResponse.json({ ok: true, updatedAt });
}

/** Retire le marquage « payée » d'une échéance (supprime l'opération liée). */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const no = Number(searchParams.get("no"));
  if (!Number.isFinite(no)) return NextResponse.json({ error: "bad_no" }, { status: 400 });

  const [seed, state] = await Promise.all([getSeed(), loadState(session.userId)]);
  const result = unmarkEcheance(seed as SeedData, state, no);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const updatedAt = await putState(session.userId, `m-${result.cycleId}`, JSON.stringify(result.updatedBucket));
  return NextResponse.json({ ok: true, updatedAt });
}
