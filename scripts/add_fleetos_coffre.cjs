// Crée le coffre + compte "Projet FleetOS" (épargne pour l'autofinancement de
// FleetOS, plan sur 48 mois démarrant août 2026) dans le cycle actif Turso.
// Sauvegarde manuelle prise avant toute écriture (comme /api/restore).
// Usage : node scripts/add_fleetos_coffre.cjs
const fs = require("fs");
const { createClient } = require("@libsql/client");

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim() || "";
const db = createClient({ url: get("TURSO_DATABASE_URL"), authToken: get("TURSO_AUTH_TOKEN") });
const USER = "romaric";
const COFFRE_NOM = "Projet FleetOS";
const OBJECTIF_1ER_VEHICULE = 6000000;

async function readState(key) {
  const r = await db.execute({ sql: "SELECT value FROM state WHERE user_id=? AND key=?", args: [USER, key] });
  return r.rows[0] ? JSON.parse(r.rows[0].value) : null;
}
async function writeState(key, value) {
  await db.execute({
    sql: `INSERT INTO state (user_id,key,value,updated_at,client_ts) VALUES (?,?,?,?,?)
          ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at, client_ts=excluded.client_ts`,
    args: [USER, key, JSON.stringify(value), Date.now(), Date.now()],
  });
}

async function backup() {
  const meta = await db.execute("SELECT key, value FROM meta WHERE key IN ('seed','seed_version')");
  const state = await db.execute({ sql: "SELECT key, value FROM state WHERE user_id = ?", args: [USER] });
  const metaMap = {};
  for (const r of meta.rows) metaMap[r.key] = r.value;
  const stateMap = {};
  for (const r of state.rows) stateMap[r.key] = r.value;
  const data = JSON.stringify({ v: 1, seed: metaMap.seed ?? null, seed_version: metaMap.seed_version ?? null, state: stateMap });
  await db.execute({
    sql: "INSERT INTO backups (user_id, created_at, kind, data) VALUES (?, ?, 'manuel', ?)",
    args: [USER, Date.now(), data],
  });
  console.log("Backup 'manuel' créée avant modification.");
}

(async () => {
  await backup();

  const cycles = await readState("cycles");
  if (!cycles) throw new Error("Pas de state 'cycles' trouvé");
  const activeId = cycles.activeId;
  const cyc = cycles.months.find((m) => m.id === activeId);
  if (!cyc) throw new Error("Cycle actif introuvable : " + activeId);
  if (cyc.seed) throw new Error("Le cycle actif est le cycle seed (pas d'opening) — cas non géré par ce script");

  cyc.opening = cyc.opening || { comptes: [], coffres: [] };

  if (!cyc.opening.comptes.some((c) => c.nom === COFFRE_NOM)) {
    cyc.opening.comptes.push({ nom: COFFRE_NOM, solde: 0, type: "épargne", note: "" });
    console.log("Compte ajouté :", COFFRE_NOM);
  } else {
    console.log("Compte déjà présent, non modifié :", COFFRE_NOM);
  }

  if (!cyc.opening.coffres.some((c) => c.nom === COFFRE_NOM)) {
    cyc.opening.coffres.push({
      nom: COFFRE_NOM,
      epargne: 0,
      objectif: OBJECTIF_1ER_VEHICULE,
      bloque: false,
      note:
        "Autofinancement 100% cash, zéro dette. Démarré août 2026. Objectif = prix du 1er véhicule (6 M), atteint en juil. 2027 si le rythme d'épargne du plan est tenu. Détail complet du plan sur 48 mois dans l'onglet FleetOS.",
    });
    console.log("Coffre ajouté :", COFFRE_NOM);
  } else {
    console.log("Coffre déjà présent, non modifié :", COFFRE_NOM);
  }

  await writeState("cycles", cycles);
  console.log("État 'cycles' mis à jour pour le cycle actif", activeId);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
