// Ajoute le mois suivant (modèle "solde partagé"), comme le bouton "+ Nouveau mois".
// Ouverture du nouveau mois = solde de CLÔTURE du dernier mois (report continu).
// Le nouveau mois démarre vide ; les opérations saisies (newOps) feront évoluer le solde.
// Usage : node scripts/add_next_month.cjs           -> ajoute le mois après le plus récent
//         node scripts/add_next_month.cjs --active   -> ... et le rend actif
const fs = require("fs");
const { createClient } = require("@libsql/client");

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim() || "";
const db = createClient({ url: get("TURSO_DATABASE_URL"), authToken: get("TURSO_AUTH_TOKEN") });
const USER = "romaric";
const MONTHS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const setActive = process.argv.includes("--active");

async function readJson(key) {
  const r = await db.execute({ sql: "SELECT value FROM state WHERE user_id=? AND key=?", args: [USER, key] });
  return r.rows[0] ? JSON.parse(r.rows[0].value) : null;
}
async function readSeed() {
  const r = await db.execute("SELECT value FROM meta WHERE key='seed'");
  return JSON.parse(r.rows[0].value);
}
async function writeState(key, value) {
  await db.execute({
    sql: `INSERT INTO state (user_id,key,value,updated_at) VALUES (?,?,?,?)
          ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
    args: [USER, key, JSON.stringify(value), Date.now()],
  });
}

// Réplique liveComptes()/liveCoffres() de app.js pour un cycle donné.
function closingBalances(meta, seed, bucket) {
  const base = (meta.seed ? seed.comptes : meta.opening.comptes).map((c) => ({ ...c }));
  const map = {};
  base.forEach((c) => (map[c.nom] = { ...c }));
  (bucket.newOps || []).forEach((o) => {
    const a = Math.abs(o.montant);
    if (o.type === "dépense") { if (map[o.compte]) map[o.compte].solde -= a; }
    else if (o.type === "revenu") { if (map[o.compte]) map[o.compte].solde += a; }
    else if (o.type === "virement") { if (map[o.compte]) map[o.compte].solde -= a; if (o.compteDest && map[o.compteDest]) map[o.compteDest].solde += a; }
  });
  const comptes = Object.values(map).map((c) => ({ nom: c.nom, solde: Math.round(c.solde), type: c.type, note: c.note || "" }));
  const normName = (s) => (s || "").toLowerCase().replace(/coffre|\(.*?\)/g, "").replace(/[^a-zàâçéèêëîïôûùüÿñæœ' ]/g, "").trim();
  const baseCof = (meta.seed ? seed.coffres : meta.opening.coffres).map((c) => ({ ...c }));
  const coffres = baseCof.map((c) => {
    const acct = comptes.find((a) => normName(a.nom) === normName(c.nom));
    return { nom: c.nom, epargne: acct ? acct.solde : c.epargne, objectif: c.objectif, bloque: c.bloque, note: "" };
  });
  return { comptes, coffres };
}

(async () => {
  const cycles = await readJson("cycles");
  const seed = await readSeed();
  if (!cycles) throw new Error("cycles introuvable");
  // dernier mois par id (YYYY-MM)
  const months = cycles.months.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  const last = months[months.length - 1];
  let y = last.year, mi = parseInt(last.mm, 10) + 1;
  if (mi > 12) { mi = 1; y++; }
  const mm = String(mi).padStart(2, "0"), id = y + "-" + mm;
  if (cycles.months.find((m) => m.id === id)) { console.log("Le mois", id, "existe déjà. Rien à faire."); return; }

  const bucket = (await readJson(last.id.startsWith("m-") ? last.id : "m-" + last.id)) || { newOps: [] };
  const { comptes, coffres } = closingBalances(last, seed, bucket);
  const meta = {
    id, label: cap(MONTHS[mi - 1]) + " " + y, mm, year: y, monthName: MONTHS[mi - 1], seed: false,
    opening: { comptes, coffres },
  };
  cycles.months.push(meta);
  if (setActive) cycles.activeId = id;

  await writeState("cycles", cycles);
  await writeState("m-" + id, { newOps: [], dettePaid: {}, ventilations: [], coffreOverrides: {}, userDettes: [], opOverrides: {}, opDeletes: [] });

  const patr = comptes.reduce((s, c) => s + c.solde, 0);
  console.log(`✅ Mois ajouté : ${meta.label} (${id})`);
  console.log(`   ouverture = clôture de ${last.label} : patrimoine ${patr.toLocaleString("fr-FR")} F`);
  console.log(`   comptes: ${comptes.map((c) => c.nom + " " + c.solde).slice(0, 3).join(", ")}, …`);
  console.log(`   actif: ${cycles.activeId}${setActive ? " (basculé)" : " (inchangé)"}`);
})().catch((e) => { console.error("ERREUR:", e.message || e); process.exit(1); });
