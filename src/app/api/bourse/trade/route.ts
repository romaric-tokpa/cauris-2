import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, getSeed, putState } from "@/lib/db";
import { recordAchat, recordDividende, recordVente, updateCoursActuel, type BourseTradeResult, type UpdateCoursResult } from "@/lib/bourse";
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

async function persist(userId: string, result: Extract<BourseTradeResult, { ok: true }>) {
  await Promise.all([
    putState(userId, "cycles", JSON.stringify(result.cycles)),
    putState(userId, `m-${result.cycleId}`, JSON.stringify(result.updatedBucket)),
  ]);
}

/** Achat, vente ou encaissement de dividende sur le portefeuille BRVM. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const action = body.action;
  const [seed, state] = await Promise.all([getSeed(), loadState(session.userId)]);

  if (action === "cours") {
    const result: UpdateCoursResult = updateCoursActuel(seed as SeedData, state, {
      code: String(body.code ?? ""),
      cours: Number(body.cours),
      date: String(body.date ?? ""),
      portefeuille: body.portefeuille ? String(body.portefeuille) : undefined,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    await putState(session.userId, "cycles", JSON.stringify(result.cycles));
    return NextResponse.json({ ok: true });
  }

  let result: BourseTradeResult;
  if (action === "achat") {
    result = recordAchat(seed as SeedData, state, {
      code: String(body.code ?? ""),
      nom: body.nom ? String(body.nom) : undefined,
      quantite: Number(body.quantite),
      prixUnitaire: Number(body.prixUnitaire),
      coursActuel: body.coursActuel != null ? Number(body.coursActuel) : undefined,
      frais: body.frais != null ? Number(body.frais) : undefined,
      compte: String(body.compte ?? ""),
      date: String(body.date ?? ""),
      portefeuille: body.portefeuille ? String(body.portefeuille) : undefined,
    });
  } else if (action === "vente") {
    result = recordVente(seed as SeedData, state, {
      code: String(body.code ?? ""),
      quantite: Number(body.quantite),
      prixUnitaire: Number(body.prixUnitaire),
      frais: body.frais != null ? Number(body.frais) : undefined,
      compte: String(body.compte ?? ""),
      date: String(body.date ?? ""),
      portefeuille: body.portefeuille ? String(body.portefeuille) : undefined,
    });
  } else if (action === "dividende") {
    result = recordDividende(seed as SeedData, state, {
      code: String(body.code ?? ""),
      montant: Number(body.montant),
      compte: String(body.compte ?? ""),
      date: String(body.date ?? ""),
      lib: body.lib ? String(body.lib) : undefined,
    });
  } else {
    return NextResponse.json({ error: "bad_action" }, { status: 400 });
  }

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  await persist(session.userId, result);
  return NextResponse.json({ ok: true });
}
