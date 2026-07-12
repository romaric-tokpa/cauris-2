import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteState, putState } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // garde-fou : 4 Mo par entrée

/** Upsert d'une entrée d'état (un cycle ou un bucket mensuel). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { key?: unknown; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const key = typeof body.key === "string" ? body.key : "";
  if (!key || key.length > 128) {
    return NextResponse.json({ error: "bad_key" }, { status: 400 });
  }
  // On ne persiste que les clés applicatives connues.
  if (!(key === "cycles" || key.startsWith("m-"))) {
    return NextResponse.json({ error: "unknown_key" }, { status: 400 });
  }

  const value = JSON.stringify(body.value ?? null);
  if (value.length > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const updatedAt = await putState(session.userId, key, value);
  return NextResponse.json({ ok: true, updatedAt });
}

/** Suppression d'une entrée d'état (cycle supprimé côté client). */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") ?? "";
  if (!key || !(key === "cycles" || key.startsWith("m-"))) {
    return NextResponse.json({ error: "bad_key" }, { status: 400 });
  }
  await deleteState(session.userId, key);
  return NextResponse.json({ ok: true });
}
