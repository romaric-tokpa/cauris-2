import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { getMetaValue, setMetaValue } from "./db";

/**
 * Authentification minimale, mono-utilisateur.
 * Le mot de passe déverrouille l'app ; la session est un cookie signé
 * HMAC-SHA256 avec SESSION_SECRET. Aucune dépendance externe.
 *
 * Le mot de passe lui-même vient soit d'un hash stocké dans la table meta
 * (changé depuis l'app, cf. changePassword ci-dessous), soit — tant qu'aucun
 * changement n'a eu lieu — de la variable d'env APP_PASSWORD.
 */

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const PASSWORD_META_KEY = "password_hash";

/**
 * Anti-brute-force sur le mot de passe : seul verrou d'accès à l'app,
 * désormais joignable publiquement (cauris-five.vercel.app). Compteur
 * persisté en base (meta), donc valable même sur des invocations serverless
 * distinctes. Mono-utilisateur : pas besoin de distinguer par IP.
 */
const LOGIN_LOCKOUT_META_KEY = "login_lockout";
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

type LockoutState = { count: number; windowStart: number; lockedUntil: number };

export class LoginLockedError extends Error {
  constructor(public retryAfterSeconds: number) {
    super(`Trop de tentatives. Réessaie dans ${Math.ceil(retryAfterSeconds / 60)} min.`);
  }
}

async function readLockoutState(): Promise<LockoutState> {
  const raw = await getMetaValue(LOGIN_LOCKOUT_META_KEY);
  if (!raw) return { count: 0, windowStart: Date.now(), lockedUntil: 0 };
  try {
    const parsed = JSON.parse(raw) as Partial<LockoutState>;
    return { count: parsed.count ?? 0, windowStart: parsed.windowStart ?? Date.now(), lockedUntil: parsed.lockedUntil ?? 0 };
  } catch {
    return { count: 0, windowStart: Date.now(), lockedUntil: 0 };
  }
}

async function writeLockoutState(state: LockoutState): Promise<void> {
  await setMetaValue(LOGIN_LOCKOUT_META_KEY, JSON.stringify(state));
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

async function verifyHashedPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = await scryptAsync(password, salt, expected.length);
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

const COOKIE = "cauris_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 jours
export const USER_ID = "romaric"; // app personnelle : un seul utilisateur logique

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET manquant ou trop court (>= 16 caractères).");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function makeToken(userId: string): string {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string | undefined): { userId: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expected = sign(`${userId}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  return { userId };
}

async function verifyPasswordOnly(input: string): Promise<boolean> {
  const storedHash = await getMetaValue(PASSWORD_META_KEY);
  if (storedHash) return verifyHashedPassword(input, storedHash);

  const expected = process.env.APP_PASSWORD ?? "";
  if (!expected) throw new Error("APP_PASSWORD non configuré.");
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Vérifie le mot de passe avec verrouillage progressif après plusieurs échecs. Lève LoginLockedError si verrouillé. */
export async function checkPassword(input: string): Promise<boolean> {
  const now = Date.now();
  let state = await readLockoutState();

  if (state.lockedUntil > now) {
    throw new LoginLockedError(Math.ceil((state.lockedUntil - now) / 1000));
  }
  if (now - state.windowStart > ATTEMPT_WINDOW_MS) {
    state = { count: 0, windowStart: now, lockedUntil: 0 };
  }

  const ok = await verifyPasswordOnly(input);

  if (ok) {
    await writeLockoutState({ count: 0, windowStart: now, lockedUntil: 0 });
    return true;
  }

  state.count += 1;
  if (state.count >= MAX_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_MS;
  }
  await writeLockoutState(state);
  return false;
}

/** Change le mot de passe partagé (web + mobile) : vérifie l'ancien, hash le nouveau dans meta. */
export async function changePassword(oldPassword: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await checkPassword(oldPassword))) return { ok: false, error: "invalid_password" };
  if (!newPassword || newPassword.length < 8) return { ok: false, error: "weak_password" };
  const hash = await hashPassword(newPassword);
  await setMetaValue(PASSWORD_META_KEY, hash);
  return { ok: true };
}

export async function createSession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, makeToken(USER_ID), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Jeton bearer pour les clients sans cookie (app mobile) : même format que le cookie web. */
export function createBearerToken(): string {
  return makeToken(USER_ID);
}

/** Renvoie l'userId si la session est valide (cookie web ou en-tête Authorization: Bearer), sinon null. */
export async function getSession(): Promise<{ userId: string } | null> {
  const h = await headers();
  const auth = h.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const fromHeader = verifyToken(auth.slice(7).trim());
    if (fromHeader) return fromHeader;
  }
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}
