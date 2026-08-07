import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllState, getSeed, putState } from "@/lib/db";
import { computeBudget, upsertBudget, deleteBudget } from "@/lib/budget";
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

/** Budget par catégorie du cycle actif, comparé aux dépenses réelles. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [seed, state] = await Promise.all([getSeed(), loadState(session.userId)]);
  return NextResponse.json(computeBudget(seed as SeedData, state));
}

/** Crée ou met à jour le budget mensuel d'une catégorie. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { cat?: unknown; montant?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const state = await loadState(session.userId);
  const result = upsertBudget(state, String(body.cat ?? ""), Number(body.montant));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const updatedAt = await putState(session.userId, "cycles", JSON.stringify(result.cycles));
  return NextResponse.json({ ok: true, updatedAt });
}

/** Retire le budget d'une catégorie. */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cat = searchParams.get("cat") ?? "";
  if (!cat) return NextResponse.json({ error: "bad_cat" }, { status: 400 });

  const state = await loadState(session.userId);
  const result = deleteBudget(state, cat);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const updatedAt = await putState(session.userId, "cycles", JSON.stringify(result.cycles));
  return NextResponse.json({ ok: true, updatedAt });
}
