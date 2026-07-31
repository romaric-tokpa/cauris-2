import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

/**
 * Endpoint léger interrogé périodiquement par sync.js pour détecter un onglet
 * resté ouvert avec un ancien app.js — voir src/lib/version.ts.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ version: APP_VERSION });
}
