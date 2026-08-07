import { NextResponse } from "next/server";
import { checkPassword, createBearerToken } from "@/lib/auth";

/** Échange le mot de passe contre un jeton bearer (client mobile, pas de cookie). */
export async function POST(req: Request) {
  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!(await checkPassword(password))) {
    return NextResponse.json({ error: "invalid_password" }, { status: 401 });
  }

  return NextResponse.json({ token: createBearerToken() });
}
