import { NextResponse } from "next/server";
import { getSession, USER_ID } from "@/lib/auth";
import { createBackup } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Le cron Vercel envoie `Authorization: Bearer ${CRON_SECRET}`. */
function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Crée une sauvegarde.
 * - Cron quotidien Vercel (GET, en-tête Bearer) -> sauvegarde 'auto'.
 * - Utilisateur connecté (POST) -> sauvegarde 'manuel'.
 */
async function handle(req: Request) {
  const cron = isAuthorizedCron(req);
  const session = cron ? null : await getSession();
  if (!cron && !session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session?.userId ?? USER_ID;
  const kind = cron ? "auto" : "manuel";
  try {
    const meta = await createBackup(userId, kind);
    return NextResponse.json({ ok: true, backup: meta });
  } catch (e) {
    return NextResponse.json({ error: "backup_failed", detail: String((e as Error).message) }, { status: 500 });
  }
}

export const GET = handle; // cron Vercel
export const POST = handle; // bouton "Sauvegarder maintenant"
