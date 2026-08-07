import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, getSeed, putState } from "@/lib/db";
import { editOperation, deleteOperation, type MutateOperationInput } from "@/lib/operations";
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

/** Modifie une opération existante du cycle actif (nouvelle ou archivée). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  let body: Partial<MutateOperationInput>;
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

  const result = editOperation(seed as SeedData, state, id, {
    type,
    montant,
    date: String(body.date ?? ""),
    lib: String(body.lib ?? ""),
    compte: String(body.compte ?? ""),
    compteDest: body.compteDest ? String(body.compteDest) : undefined,
    cat: body.cat ? String(body.cat) : undefined,
    note: body.note ? String(body.note) : undefined,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const updatedAt = await putState(session.userId, bucketKey(result.cycleId), JSON.stringify(result.updatedBucket));
  return NextResponse.json({ ok: true, updatedAt });
}

/** Supprime une opération existante du cycle actif (nouvelle ou archivée). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const [seed, state] = await Promise.all([getSeed(), loadState(session.userId)]);

  const result = deleteOperation(seed as SeedData, state, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const updatedAt = await putState(session.userId, bucketKey(result.cycleId), JSON.stringify(result.updatedBucket));
  return NextResponse.json({ ok: true, updatedAt });
}
