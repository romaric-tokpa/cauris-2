import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listBackups } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Liste des sauvegardes de l'utilisateur (métadonnées). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const backups = await listBackups(session.userId);
  return NextResponse.json({ backups });
}
