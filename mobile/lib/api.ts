import { clearToken, getToken, setToken } from "./session";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}

/** Échange le mot de passe contre un jeton bearer et le persiste dans SecureStore. */
export async function login(password: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? "Mot de passe incorrect." : "Connexion impossible.");
  }
  const { token } = (await res.json()) as { token: string };
  await setToken(token);
}

export async function logout(): Promise<void> {
  await clearToken();
}

/** Fetch authentifié : ajoute le jeton bearer, lève UnauthorizedError sur 401. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    await clearToken();
    throw new UnauthorizedError();
  }
  return res;
}
