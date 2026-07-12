// Pousse dans Turso : le seed Juin corrigé (meta.seed + version) et l'état
// utilisateur (cycles + buckets mensuels), en supprimant l'ancien état incorrect.
// Lit les identifiants depuis .env.local et les données depuis build/*.json.
const fs = require("fs");
const { createClient } = require("@libsql/client");

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim() || "";
const url = get("TURSO_DATABASE_URL");
const authToken = get("TURSO_AUTH_TOKEN");
if (!url) throw new Error("TURSO_DATABASE_URL manquant");

const USER_ID = "romaric";
const SEED_VERSION = "2026-06.v2";
const seed = JSON.parse(fs.readFileSync("build/seed.json", "utf8"));
const state = JSON.parse(fs.readFileSync("build/state.json", "utf8"));

(async () => {
  const db = createClient({ url, authToken });
  const now = Date.now();

  // 1) Seed corrigé (source de vérité du cycle d'origine).
  await db.execute({
    sql: `INSERT INTO meta (key, value) VALUES ('seed', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [JSON.stringify(seed)],
  });
  await db.execute({
    sql: `INSERT INTO meta (key, value) VALUES ('seed_version', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [SEED_VERSION],
  });

  // 2) Supprime tout l'ancien état (données incorrectes) de l'utilisateur.
  await db.execute({ sql: "DELETE FROM state WHERE user_id = ?", args: [USER_ID] });

  // 3) Insère le nouvel état : cycles + buckets Juin/Juillet.
  for (const [key, value] of Object.entries(state)) {
    await db.execute({
      sql: `INSERT INTO state (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, key) DO UPDATE
              SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [USER_ID, key, JSON.stringify(value), now],
    });
    console.log("  ✓ state:", key, `(${JSON.stringify(value).length} o)`);
  }

  // 4) Contrôle.
  const m = await db.execute("SELECT key, length(value) l FROM meta");
  const s = await db.execute({ sql: "SELECT key, length(value) l FROM state WHERE user_id = ? ORDER BY key", args: [USER_ID] });
  console.log("meta:", m.rows.map((r) => `${r.key}(${r.l})`).join(", "));
  console.log("state:", s.rows.map((r) => `${r.key}(${r.l})`).join(", "));
  const sd = await db.execute("SELECT json_extract(value,'$.asOf') a, json_array_length(value,'$.operations') n FROM meta WHERE key='seed'");
  console.log("seed dans Turso -> asOf:", sd.rows[0].a, "| ops:", sd.rows[0].n);
  console.log("OK");
})().catch((e) => { console.error("ERREUR:", e.message || e); process.exit(1); });
