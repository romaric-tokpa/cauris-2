import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteState, getState, putState } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

type Profile = { photo?: string };

function parseProfile(raw: string | null): Profile {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return {};
  }
}

/** Photo de profil (avatar Plus/Réglages) — stockée en data URI dans l'état utilisateur. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await getState(session.userId, "profile");
  return NextResponse.json({ photo: parseProfile(raw).photo ?? null });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const photo = typeof body.photo === "string" ? body.photo : "";
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/.test(photo)) {
    return NextResponse.json({ error: "Image invalide." }, { status: 400 });
  }
  if (photo.length > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Image trop volumineuse." }, { status: 400 });
  }

  await putState(session.userId, "profile", JSON.stringify({ photo }));
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await deleteState(session.userId, "profile");
  return NextResponse.json({ ok: true });
}
