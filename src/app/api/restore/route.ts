import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { restoreBackup } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Restaure une sauvegarde (l'état actuel est d'abord sauvegardé, réversible). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const id = Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const result = await restoreBackup(session.userId, id);
  if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(result);
}
