import { NextResponse } from "next/server";
import { changePassword, getSession, LoginLockedError } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Change le mot de passe partagé (web + mobile). Exige une session valide + l'ancien mot de passe. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { oldPassword?: unknown; newPassword?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const oldPassword = typeof body.oldPassword === "string" ? body.oldPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  try {
    const result = await changePassword(oldPassword, newPassword);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof LoginLockedError) {
      return NextResponse.json({ error: "locked", message: e.message }, { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } });
    }
    throw e;
  }
}
