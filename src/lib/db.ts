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
         client_ts  INTEGER NOT NULL DEFAULT 0,
         PRIMARY KEY (user_id, key)
       )`,
      `CREATE TABLE IF NOT EXISTS meta (
         key   TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
      `CREATE TABLE IF NOT EXISTS backups (
         id         INTEGER PRIMARY KEY AUTOINCREMENT,
         user_id    TEXT NOT NULL,
         created_at INTEGER NOT NULL,
         kind       TEXT NOT NULL,   -- 'auto' | 'manuel' | 'pré-restauration'
         data       TEXT NOT NULL    -- JSON { seed, seed_version, state:{key:valueJSON} }
       )`,
      `CREATE INDEX IF NOT EXISTS idx_backups_user_time ON backups(user_id, created_at DESC)`,
    ],
    "write",
  );

  // Migration : les bases existantes n'ont pas encore la colonne client_ts
  // (ajoutée pour empêcher une écriture réseau en retard d'écraser une plus
  // récente — cf. le solde qui ne se répercutait plus après clôture).
  const cols = await client.execute("PRAGMA table_info(state)");
  if (!cols.rows.some((r) => r.name === "client_ts")) {
    await client.execute("ALTER TABLE state ADD COLUMN client_ts INTEGER NOT NULL DEFAULT 0");
  }

  // On stocke le cycle d'origine (seed) dans Turso pour qu'il soit la source
  // de vérité, versionnée. On ré-écrit si la version du seed change.
  const SEED_VERSION = "2026-06.v2";
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

let _seedCache: unknown | null = null;

/**
 * Renvoie les données seed (cycle d'origine) depuis Turso, avec repli sur la
 * constante. Mémoïsé en mémoire pour le process : le seed n'est réécrit que
 * lors d'un bump de SEED_VERSION dans ensureSchema() (donc au redémarrage),
 * jamais en cours de route — cet aller-retour réseau était refait à chaque
 * appel API alors qu'il ne change jamais entre deux requêtes.
 */
export async function getSeed(): Promise<unknown> {
  if (_seedCache !== null) return _seedCache;
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT value FROM meta WHERE key = 'seed'", args: [] });
  const raw = r.rows[0]?.value;
  let seed: unknown = SEED;
  if (typeof raw === "string") {
    try {
      seed = JSON.parse(raw);
    } catch {
      /* ignore, use constant */
    }
  }
  _seedCache = seed;
  return seed;
}

/** Lit une valeur générique de la table meta (ex. le hash du mot de passe). */
export async function getMetaValue(key: string): Promise<string | null> {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT value FROM meta WHERE key = ?", args: [key] });
  return r.rows[0] ? String(r.rows[0].value) : null;
}

/** Écrit (upsert) une valeur générique dans la table meta. */
export async function setMetaValue(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [key, value],
  });
}

export type StateRow = { key: string; value: string; updated_at: number };

/** Une seule entrée d'état, sans charger tout le reste (ex. photo de profil). */
export async function getState(userId: string, key: string): Promise<string | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: "SELECT value FROM state WHERE user_id = ? AND key = ?",
    args: [userId, key],
  });
  const row = r.rows[0];
  return row ? String(row.value) : null;
}

/**
 * Toutes les entrées d'état (cycles + buckets mensuels) d'un utilisateur —
 * exclut volontairement "profile" (photo en data URI, dizaines de Ko) que
 * la logique cycles/buckets n'utilise jamais : la charger ici alourdirait
 * chaque appel API pour rien. La photo se lit via getState() dédié.
 */
export async function getAllState(userId: string): Promise<StateRow[]> {
  const db = await getDb();
  const r = await db.execute({
    sql: "SELECT key, value, updated_at FROM state WHERE user_id = ? AND key != 'profile'",
    args: [userId],
  });
  return r.rows.map((row) => ({
    key: String(row.key),
    value: String(row.value),
    updated_at: Number(row.updated_at),
  }));
}

/**
 * Écrit (upsert) une entrée d'état.
 *
 * `clientTs` (horodatage client, capturé au moment de l'écriture locale) sert
 * de garde anti-régression : deux appareils peuvent écrire la même clé
 * (ex. "cycles") en parallèle, et rien ne garantit que leurs requêtes
 * arrivent au serveur dans l'ordre où elles ont été émises. Sans garde, une
 * requête émise plus tôt mais arrivée en dernier écraserait un état plus
 * récent. Le WHERE dans le UPSERT rend ce refus atomique côté SQLite.
 */
export async function putState(
  userId: string,
  key: string,
  value: string,
  clientTs?: number,
): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const ts = Number.isFinite(clientTs) ? (clientTs as number) : now;
  const r = await db.execute({
    sql: `INSERT INTO state (user_id, key, value, updated_at, client_ts)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, key) DO UPDATE
            SET value = excluded.value, updated_at = excluded.updated_at, client_ts = excluded.client_ts
            WHERE excluded.client_ts >= state.client_ts`,
    args: [userId, key, value, now, ts],
  });
  // Écriture ignorée (plus ancienne que ce qui est déjà stocké) : on renvoie
  // l'updated_at actuel plutôt que `now`, pour ne pas laisser croire au
  // client que sa valeur a bien été persistée.
  if (r.rowsAffected === 0) {
    const cur = await db.execute({
      sql: "SELECT updated_at FROM state WHERE user_id = ? AND key = ?",
      args: [userId, key],
    });
    return Number(cur.rows[0]?.updated_at ?? now);
  }
  return now;
}

/** Supprime une entrée d'état (ex. cycle supprimé). */
export async function deleteState(userId: string, key: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM state WHERE user_id = ? AND key = ?", args: [userId, key] });
}

/* ============================================================
   SAUVEGARDES (backups) — snapshot complet + restauration
   ============================================================ */

export type BackupKind = "auto" | "manuel" | "pré-restauration";

/** Capture brute des données de l'utilisateur (seed global + tout son état). */
async function snapshot(userId: string): Promise<string> {
  const db = await getDb();
  const meta = await db.execute("SELECT key, value FROM meta WHERE key IN ('seed','seed_version')");
  const state = await db.execute({ sql: "SELECT key, value FROM state WHERE user_id = ?", args: [userId] });
  const metaMap: Record<string, string> = {};
  for (const r of meta.rows) metaMap[String(r.key)] = String(r.value);
  const stateMap: Record<string, string> = {};
  for (const r of state.rows) stateMap[String(r.key)] = String(r.value);
  return JSON.stringify({
    v: 1,
    seed: metaMap.seed ?? null,
    seed_version: metaMap.seed_version ?? null,
    state: stateMap,
  });
}

export type BackupMeta = { id: number; created_at: number; kind: string; bytes: number; cycles: number };

/** Crée une sauvegarde, puis élague pour ne garder que `keep` sauvegardes 'auto'. */
export async function createBackup(userId: string, kind: BackupKind, keepAuto = 30): Promise<BackupMeta> {
  const db = await getDb();
  const data = await snapshot(userId);
  const now = Date.now();
  const ins = await db.execute({
    sql: "INSERT INTO backups (user_id, created_at, kind, data) VALUES (?, ?, ?, ?)",
    args: [userId, now, kind, data],
  });
  const id = Number(ins.lastInsertRowid);
  // Élagage : garder les `keepAuto` dernières 'auto' (les manuelles/pré-restauration restent).
  await db.execute({
    sql: `DELETE FROM backups WHERE user_id = ? AND kind = 'auto' AND id NOT IN (
            SELECT id FROM backups WHERE user_id = ? AND kind = 'auto' ORDER BY created_at DESC LIMIT ?
          )`,
    args: [userId, userId, keepAuto],
  });
  let cycles = 0;
  try {
    cycles = (JSON.parse(JSON.parse(data).state?.cycles ?? "null")?.months ?? []).length;
  } catch {
    /* ignore */
  }
  return { id, created_at: now, kind, bytes: data.length, cycles };
}

/** Liste les sauvegardes (métadonnées seulement, sans le contenu). */
export async function listBackups(userId: string): Promise<BackupMeta[]> {
  const db = await getDb();
  const r = await db.execute({
    sql: "SELECT id, created_at, kind, length(data) AS bytes, data FROM backups WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });
  return r.rows.map((row) => {
    let cycles = 0;
    try {
      cycles = (JSON.parse(JSON.parse(String(row.data)).state?.cycles ?? "null")?.months ?? []).length;
    } catch {
      /* ignore */
    }
    return {
      id: Number(row.id),
      created_at: Number(row.created_at),
      kind: String(row.kind),
      bytes: Number(row.bytes),
      cycles,
    };
  });
}

/** Renvoie le contenu brut d'une sauvegarde (pour téléchargement). */
export async function getBackupData(userId: string, id: number): Promise<string | null> {
  const db = await getDb();
  const r = await db.execute({
    sql: "SELECT data FROM backups WHERE user_id = ? AND id = ?",
    args: [userId, id],
  });
  return r.rows[0] ? String(r.rows[0].data) : null;
}

/** Restaure une sauvegarde : sauvegarde d'abord l'état actuel (réversible), puis écrase. */
export async function restoreBackup(userId: string, id: number): Promise<{ ok: boolean; restoredFrom: number; safetyBackup: number } | null> {
  const db = await getDb();
  const raw = await getBackupData(userId, id);
  if (!raw) return null;
  let parsed: { seed: string | null; seed_version: string | null; state: Record<string, string> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  // Filet de sécurité : snapshot de l'état courant avant d'écraser.
  const safety = await createBackup(userId, "pré-restauration");

  const stmts: { sql: string; args: (string | number)[] }[] = [];
  if (parsed.seed != null) {
    stmts.push({
      sql: "INSERT INTO meta (key, value) VALUES ('seed', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      args: [parsed.seed],
    });
  }
  if (parsed.seed_version != null) {
    stmts.push({
      sql: "INSERT INTO meta (key, value) VALUES ('seed_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      args: [parsed.seed_version],
    });
  }
  stmts.push({ sql: "DELETE FROM state WHERE user_id = ?", args: [userId] });
  const now = Date.now();
  for (const [key, value] of Object.entries(parsed.state || {})) {
    stmts.push({
      sql: "INSERT INTO state (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)",
      args: [userId, key, value, now],
    });
  }
  await db.batch(stmts, "write");
  return { ok: true, restoredFrom: id, safetyBackup: safety.id };
}
