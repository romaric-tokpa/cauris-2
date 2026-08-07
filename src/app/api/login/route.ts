import { NextResponse } from "next/server";
import { checkPassword, createBearerToken, LoginLockedError } from "@/lib/auth";

/** Échange le mot de passe contre un jeton bearer (client mobile, pas de cookie). */
export async function POST(req: Request) {
  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  try {
    if (!(await checkPassword(password))) {
      return NextResponse.json({ error: "invalid_password" }, { status: 401 });
    }
  } catch (e) {
    if (e instanceof LoginLockedError) {
      return NextResponse.json({ error: "locked", message: e.message }, { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } });
    }
    throw e;
  }

  return NextResponse.json({ token: createBearerToken() });
}
