import { createClient, type Client } from "@libsql/client";
import { SEED } from "./seed";

/**
 * Client Turso / libSQL.
 *
 * - Production : renseignez TURSO_DATABASE_URL (libsql://…) + TURSO_AUTH_TOKEN.
 * - Local      : si TURSO_DATABASE_URL est vide, on retombe sur un fichier
 *                SQLite ./data/cauris.db (aucun compte Turso nécessaire pour dev).
 */

let _client: Client | null = null;
let _ready: Promise<void> | null = null;

function makeClient(): Client {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (url) {
    return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() });
  }
  // Fallback local : base fichier.
  return createClient({ url: "file:data/cauris.db" });
}

async function ensureSchema(client: Client): Promise<void> {
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS state (
         user_id    TEXT NOT NULL,
         key        TEXT NOT NULL,
         value      TEXT NOT NULL,
         updated_at INTEGER NOT NULL,
         PRIMARY KEY (user_id, key)
       )`,
      `CREATE TABLE IF NOT EXISTS meta (
         key   TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
    ],
    "write",
  );

  // On stocke le cycle d'origine (seed) dans Turso pour qu'il soit la source
  // de vérité, versionnée. On ré-écrit si la version du seed change.
  const SEED_VERSION = "2026-06.v1";
  const cur = await client.execute({
    sql: "SELECT value FROM meta WHERE key = 'seed_version'",
    args: [],
  });
  if (cur.rows[0]?.value !== SEED_VERSION) {
    await client.execute({
      sql: `INSERT INTO meta (key, value) VALUES ('seed', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [JSON.stringify(SEED)],
    });
    await client.execute({
      sql: `INSERT INTO meta (key, value) VALUES ('seed_version', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [SEED_VERSION],
    });
  }
}

export async function getDb(): Promise<Client> {
  if (!_client) _client = makeClient();
  if (!_ready) _ready = ensureSchema(_client);
  await _ready;
  return _client;
}

/** Renvoie les données seed (cycle d'origine) depuis Turso, avec repli sur la constante. */
export async function getSeed(): Promise<unknown> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT value FROM meta WHERE key = 'seed'", args: [] });
  const raw = r.rows[0]?.value;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      /* ignore, use constant */
    }
  }
  return SEED;
}

export type StateRow = { key: string; value: string; updated_at: number };

/** Toutes les entrées d'état (cycles + buckets mensuels) d'un utilisateur. */
export async function getAllState(userId: string): Promise<StateRow[]> {
  const db = await getDb();
  const r = await db.execute({
    sql: "SELECT key, value, updated_at FROM state WHERE user_id = ?",
    args: [userId],
  });
  return r.rows.map((row) => ({
    key: String(row.key),
    value: String(row.value),
    updated_at: Number(row.updated_at),
  }));
}

/** Écrit (upsert) une entrée d'état. */
export async function putState(userId: string, key: string, value: string): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO state (user_id, key, value, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, key) DO UPDATE
            SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [userId, key, value, now],
  });
  return now;
}

/** Supprime une entrée d'état (ex. cycle supprimé). */
export async function deleteState(userId: string, key: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM state WHERE user_id = ? AND key = ?", args: [userId, key] });
}
