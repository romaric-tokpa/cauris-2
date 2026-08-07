import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, getSeed, putState } from "@/lib/db";
import { computeOperationsFeed, appendOperation, type AppendOperationInput } from "@/lib/operations";
import { bucketKey } from "@/lib/cycle";
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

/** Journal des opérations du cycle actif (archivées + ajoutées). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [seed, state] = await Promise.all([getSeed(), loadState(session.userId)]);
  return NextResponse.json(computeOperationsFeed(seed as SeedData, state));
}

/** Ajoute une opération au cycle actif (dépense/revenu/virement, avec frais optionnels). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Partial<AppendOperationInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const type = body.type;
  if (type !== "dépense" && type !== "revenu" && type !== "virement") {
    return NextResponse.json({ error: "bad_type" }, { status: 400 });
  }
  const montant = Number(body.montant);
  if (!Number.isFinite(montant)) return NextResponse.json({ error: "bad_montant" }, { status: 400 });

  const [seed, state] = await Promise.all([getSeed(), loadState(session.userId)]);

  const result = appendOperation(seed as SeedData, state, {
    type,
    montant,
    date: String(body.date ?? ""),
    lib: String(body.lib ?? ""),
    compte: String(body.compte ?? ""),
    compteDest: body.compteDest ? String(body.compteDest) : undefined,
    cat: body.cat ? String(body.cat) : undefined,
    note: body.note ? String(body.note) : undefined,
    frais: body.frais ? Number(body.frais) : undefined,
    asDette: body.asDette === true,
    detteEcheance: body.detteEcheance ? String(body.detteEcheance) : undefined,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const updatedAt = await putState(session.userId, bucketKey(result.cycleId), JSON.stringify(result.updatedBucket));
  return NextResponse.json({ ok: true, updatedAt });
}
