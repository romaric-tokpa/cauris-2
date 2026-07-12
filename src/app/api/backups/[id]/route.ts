import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBackupData } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Télécharge une sauvegarde en JSON (copie hors-ligne). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const data = await getBackupData(session.userId, Number(id));
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="cauris-backup-${id}.json"`,
    },
  });
}
