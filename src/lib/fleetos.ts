import "server-only";
import type { SeedData } from "./seed";
import { resolveCycleContext, resolvedOpsForMonth, round, type Operation } from "./cycle";

/**
 * FleetOS — plan d'autofinancement sur 48 mois (achat cash de véhicules,
 * 6 M/véhicule), démarré août 2026, zéro dette. Indépendant des cycles
 * mensuels : compare l'épargne RÉELLE du coffre « Projet FleetOS » (alimenté
 * par de vrais virements dans le journal) à la trajectoire prévue ci-dessous.
 * Port de public/app.js:1798-1952 (FLEETOS_INFO/FLEETOS_PLAN/fleetosSummary).
 */

export const FLEETOS_INFO = {
  coffre: "Projet FleetOS",
  prixVehicule: 6000000,
  revenuVehiculeMois: 290000,
  epargneAvant2027: 370000,
  epargneDes2027: 670000,
  debut: "août 2026",
  horizon: "juillet 2030 (mois 48)",
};

export type FleetosRow = {
  n: number;
  y: number;
  mm: string;
  label: string;
  epargne: number;
  revenuFlotte: number;
  tresoFin: number;
  achats: number;
  vehFin: number;
  valeurFlotte: number;
  patrimoine: number;
};

export const FLEETOS_PLAN: FleetosRow[] = [
  { n: 1, y: 2026, mm: "08", label: "août 2026", epargne: 370000, revenuFlotte: 0, tresoFin: 370000, achats: 0, vehFin: 0, valeurFlotte: 0, patrimoine: 370000 },
  { n: 2, y: 2026, mm: "09", label: "septembre 2026", epargne: 370000, revenuFlotte: 0, tresoFin: 740000, achats: 0, vehFin: 0, valeurFlotte: 0, patrimoine: 740000 },
  { n: 3, y: 2026, mm: "10", label: "octobre 2026", epargne: 370000, revenuFlotte: 0, tresoFin: 1110000, achats: 0, vehFin: 0, valeurFlotte: 0, patrimoine: 1110000 },
  { n: 4, y: 2026, mm: "11", label: "novembre 2026", epargne: 370000, revenuFlotte: 0, tresoFin: 1480000, achats: 0, vehFin: 0, valeurFlotte: 0, patrimoine: 1480000 },
  { n: 5, y: 2026, mm: "12", label: "décembre 2026", epargne: 370000, revenuFlotte: 0, tresoFin: 1850000, achats: 0, vehFin: 0, valeurFlotte: 0, patrimoine: 1850000 },
  { n: 6, y: 2027, mm: "01", label: "janvier 2027", epargne: 670000, revenuFlotte: 0, tresoFin: 2520000, achats: 0, vehFin: 0, valeurFlotte: 0, patrimoine: 2520000 },
  { n: 7, y: 2027, mm: "02", label: "février 2027", epargne: 670000, revenuFlotte: 0, tresoFin: 3190000, achats: 0, vehFin: 0, valeurFlotte: 0, patrimoine: 3190000 },
  { n: 8, y: 2027, mm: "03", label: "mars 2027", epargne: 670000, revenuFlotte: 0, tresoFin: 3860000, achats: 0, vehFin: 0, valeurFlotte: 0, patrimoine: 3860000 },
  { n: 9, y: 2027, mm: "04", label: "avril 2027", epargne: 670000, revenuFlotte: 0, tresoFin: 4530000, achats: 0, vehFin: 0, valeurFlotte: 0, patrimoine: 4530000 },
  { n: 10, y: 2027, mm: "05", label: "mai 2027", epargne: 670000, revenuFlotte: 0, tresoFin: 5200000, achats: 0, vehFin: 0, valeurFlotte: 0, patrimoine: 5200000 },
  { n: 11, y: 2027, mm: "06", label: "juin 2027", epargne: 670000, revenuFlotte: 0, tresoFin: 5870000, achats: 0, vehFin: 0, valeurFlotte: 0, patrimoine: 5870000 },
  { n: 12, y: 2027, mm: "07", label: "juillet 2027", epargne: 670000, revenuFlotte: 0, tresoFin: 540000, achats: 1, vehFin: 1, valeurFlotte: 6000000, patrimoine: 6540000 },
  { n: 13, y: 2027, mm: "08", label: "août 2027", epargne: 670000, revenuFlotte: 290000, tresoFin: 1500000, achats: 0, vehFin: 1, valeurFlotte: 6000000, patrimoine: 7500000 },
  { n: 14, y: 2027, mm: "09", label: "septembre 2027", epargne: 670000, revenuFlotte: 290000, tresoFin: 2460000, achats: 0, vehFin: 1, valeurFlotte: 6000000, patrimoine: 8460000 },
  { n: 15, y: 2027, mm: "10", label: "octobre 2027", epargne: 670000, revenuFlotte: 290000, tresoFin: 3420000, achats: 0, vehFin: 1, valeurFlotte: 6000000, patrimoine: 9420000 },
  { n: 16, y: 2027, mm: "11", label: "novembre 2027", epargne: 670000, revenuFlotte: 290000, tresoFin: 4380000, achats: 0, vehFin: 1, valeurFlotte: 6000000, patrimoine: 10380000 },
  { n: 17, y: 2027, mm: "12", label: "décembre 2027", epargne: 670000, revenuFlotte: 290000, tresoFin: 5340000, achats: 0, vehFin: 1, valeurFlotte: 6000000, patrimoine: 11340000 },
  { n: 18, y: 2028, mm: "01", label: "janvier 2028", epargne: 670000, revenuFlotte: 290000, tresoFin: 300000, achats: 1, vehFin: 2, valeurFlotte: 12000000, patrimoine: 12300000 },
  { n: 19, y: 2028, mm: "02", label: "février 2028", epargne: 670000, revenuFlotte: 580000, tresoFin: 1550000, achats: 0, vehFin: 2, valeurFlotte: 12000000, patrimoine: 13550000 },
  { n: 20, y: 2028, mm: "03", label: "mars 2028", epargne: 670000, revenuFlotte: 580000, tresoFin: 2800000, achats: 0, vehFin: 2, valeurFlotte: 12000000, patrimoine: 14800000 },
  { n: 21, y: 2028, mm: "04", label: "avril 2028", epargne: 670000, revenuFlotte: 580000, tresoFin: 4050000, achats: 0, vehFin: 2, valeurFlotte: 12000000, patrimoine: 16050000 },
  { n: 22, y: 2028, mm: "05", label: "mai 2028", epargne: 670000, revenuFlotte: 580000, tresoFin: 5300000, achats: 0, vehFin: 2, valeurFlotte: 12000000, patrimoine: 17300000 },
  { n: 23, y: 2028, mm: "06", label: "juin 2028", epargne: 670000, revenuFlotte: 580000, tresoFin: 550000, achats: 1, vehFin: 3, valeurFlotte: 18000000, patrimoine: 18550000 },
  { n: 24, y: 2028, mm: "07", label: "juillet 2028", epargne: 670000, revenuFlotte: 870000, tresoFin: 2090000, achats: 0, vehFin: 3, valeurFlotte: 18000000, patrimoine: 20090000 },
  { n: 25, y: 2028, mm: "08", label: "août 2028", epargne: 670000, revenuFlotte: 870000, tresoFin: 3630000, achats: 0, vehFin: 3, valeurFlotte: 18000000, patrimoine: 21630000 },
  { n: 26, y: 2028, mm: "09", label: "septembre 2028", epargne: 670000, revenuFlotte: 870000, tresoFin: 5170000, achats: 0, vehFin: 3, valeurFlotte: 18000000, patrimoine: 23170000 },
  { n: 27, y: 2028, mm: "10", label: "octobre 2028", epargne: 670000, revenuFlotte: 870000, tresoFin: 710000, achats: 1, vehFin: 4, valeurFlotte: 24000000, patrimoine: 24710000 },
  { n: 28, y: 2028, mm: "11", label: "novembre 2028", epargne: 670000, revenuFlotte: 1160000, tresoFin: 2540000, achats: 0, vehFin: 4, valeurFlotte: 24000000, patrimoine: 26540000 },
  { n: 29, y: 2028, mm: "12", label: "décembre 2028", epargne: 670000, revenuFlotte: 1160000, tresoFin: 4370000, achats: 0, vehFin: 4, valeurFlotte: 24000000, patrimoine: 28370000 },
  { n: 30, y: 2029, mm: "01", label: "janvier 2029", epargne: 670000, revenuFlotte: 1160000, tresoFin: 200000, achats: 1, vehFin: 5, valeurFlotte: 30000000, patrimoine: 30200000 },
  { n: 31, y: 2029, mm: "02", label: "février 2029", epargne: 670000, revenuFlotte: 1450000, tresoFin: 2320000, achats: 0, vehFin: 5, valeurFlotte: 30000000, patrimoine: 32320000 },
  { n: 32, y: 2029, mm: "03", label: "mars 2029", epargne: 670000, revenuFlotte: 1450000, tresoFin: 4440000, achats: 0, vehFin: 5, valeurFlotte: 30000000, patrimoine: 34440000 },
  { n: 33, y: 2029, mm: "04", label: "avril 2029", epargne: 670000, revenuFlotte: 1450000, tresoFin: 560000, achats: 1, vehFin: 6, valeurFlotte: 36000000, patrimoine: 36560000 },
  { n: 34, y: 2029, mm: "05", label: "mai 2029", epargne: 670000, revenuFlotte: 1740000, tresoFin: 2970000, achats: 0, vehFin: 6, valeurFlotte: 36000000, patrimoine: 38970000 },
  { n: 35, y: 2029, mm: "06", label: "juin 2029", epargne: 670000, revenuFlotte: 1740000, tresoFin: 5380000, achats: 0, vehFin: 6, valeurFlotte: 36000000, patrimoine: 41380000 },
  { n: 36, y: 2029, mm: "07", label: "juillet 2029", epargne: 670000, revenuFlotte: 1740000, tresoFin: 1790000, achats: 1, vehFin: 7, valeurFlotte: 42000000, patrimoine: 43790000 },
  { n: 37, y: 2029, mm: "08", label: "août 2029", epargne: 670000, revenuFlotte: 2030000, tresoFin: 4490000, achats: 0, vehFin: 7, valeurFlotte: 42000000, patrimoine: 46490000 },
  { n: 38, y: 2029, mm: "09", label: "septembre 2029", epargne: 670000, revenuFlotte: 2030000, tresoFin: 1190000, achats: 1, vehFin: 8, valeurFlotte: 48000000, patrimoine: 49190000 },
  { n: 39, y: 2029, mm: "10", label: "octobre 2029", epargne: 670000, revenuFlotte: 2320000, tresoFin: 4180000, achats: 0, vehFin: 8, valeurFlotte: 48000000, patrimoine: 52180000 },
  { n: 40, y: 2029, mm: "11", label: "novembre 2029", epargne: 670000, revenuFlotte: 2320000, tresoFin: 1170000, achats: 1, vehFin: 9, valeurFlotte: 54000000, patrimoine: 55170000 },
  { n: 41, y: 2029, mm: "12", label: "décembre 2029", epargne: 670000, revenuFlotte: 2610000, tresoFin: 4450000, achats: 0, vehFin: 9, valeurFlotte: 54000000, patrimoine: 58450000 },
  { n: 42, y: 2030, mm: "01", label: "janvier 2030", epargne: 670000, revenuFlotte: 2610000, tresoFin: 1730000, achats: 1, vehFin: 10, valeurFlotte: 60000000, patrimoine: 61730000 },
  { n: 43, y: 2030, mm: "02", label: "février 2030", epargne: 670000, revenuFlotte: 2900000, tresoFin: 5300000, achats: 0, vehFin: 10, valeurFlotte: 60000000, patrimoine: 65300000 },
  { n: 44, y: 2030, mm: "03", label: "mars 2030", epargne: 670000, revenuFlotte: 2900000, tresoFin: 2870000, achats: 1, vehFin: 11, valeurFlotte: 66000000, patrimoine: 68870000 },
  { n: 45, y: 2030, mm: "04", label: "avril 2030", epargne: 670000, revenuFlotte: 3190000, tresoFin: 730000, achats: 1, vehFin: 12, valeurFlotte: 72000000, patrimoine: 72730000 },
  { n: 46, y: 2030, mm: "05", label: "mai 2030", epargne: 670000, revenuFlotte: 3480000, tresoFin: 4880000, achats: 0, vehFin: 12, valeurFlotte: 72000000, patrimoine: 76880000 },
  { n: 47, y: 2030, mm: "06", label: "juin 2030", epargne: 670000, revenuFlotte: 3480000, tresoFin: 3030000, achats: 1, vehFin: 13, valeurFlotte: 78000000, patrimoine: 81030000 },
  { n: 48, y: 2030, mm: "07", label: "juillet 2030", epargne: 670000, revenuFlotte: 3770000, tresoFin: 1470000, achats: 1, vehFin: 14, valeurFlotte: 84000000, patrimoine: 85470000 },
];

/** Mois du plan correspondant à aujourd'hui (n=1 -> août 2026), borné à [1,48]. */
export function fleetosMonthIndex(): number {
  const t = new Date();
  const n = (t.getFullYear() - 2026) * 12 + (t.getMonth() + 1 - 8) + 1;
  return Math.max(1, Math.min(48, n));
}

function fleetosRow(n: number): FleetosRow {
  return FLEETOS_PLAN.find((r) => r.n === n) ?? FLEETOS_PLAN[FLEETOS_PLAN.length - 1];
}

export type FleetosSummary = {
  n: number;
  cur: FleetosRow;
  nextAchat: FleetosRow | null;
  vivant: number;
  ecart: number;
};

export type FleetosPlanRow = FleetosRow & { epargneCumulPrevue: number; epargneReelle: number | null };

export type FleetosResponse = {
  info: typeof FLEETOS_INFO;
  summary: FleetosSummary;
  plan: FleetosPlanRow[];
};

/** Flux net d'un mois résolu vers/depuis un compte donné — mêmes règles que liveComptes() dans cycle.ts. */
function monthlyAccountDelta(ops: Operation[], compteName: string): number {
  let delta = 0;
  ops.forEach((o) => {
    const a = Math.abs(o.montant);
    if (o.type === "dépense" || o.type === "achat_titre") {
      if (o.compte === compteName) delta -= a;
    } else if (o.type === "revenu" || o.type === "dividende" || o.type === "vente_titre") {
      if (o.compte === compteName) delta += a;
    } else if (o.type === "virement") {
      if (o.compte === compteName) delta -= a;
      if (o.compteDest === compteName) delta += a;
    }
  });
  return delta;
}

/** Épargne réelle = solde live du coffre « Projet FleetOS ». */
export function computeFleetos(seed: SeedData, state: Record<string, unknown>): FleetosResponse {
  const ctx = resolveCycleContext(seed, state);
  const coffre = ctx.liveCoffres().find((c) => c.nom === FLEETOS_INFO.coffre);
  const vivant = coffre ? round(coffre.epargne) : 0;

  const n = fleetosMonthIndex();
  const cur = fleetosRow(n);
  const nextAchat = FLEETOS_PLAN.find((r) => r.achats > 0 && r.n >= n) ?? null;
  const ecart = vivant - cur.tresoFin;

  let cumulEpargnePrevue = 0;
  const plan: FleetosPlanRow[] = FLEETOS_PLAN.map((row) => {
    cumulEpargnePrevue = round(cumulEpargnePrevue + row.epargne);
    const meta = ctx.cycles.months.find((m) => m.id === `${row.y}-${row.mm}`);
    const epargneReelle = meta ? round(monthlyAccountDelta(resolvedOpsForMonth(seed, state, meta), FLEETOS_INFO.coffre)) : null;
    return { ...row, epargneCumulPrevue: cumulEpargnePrevue, epargneReelle };
  });

  return { info: FLEETOS_INFO, summary: { n, cur, nextAchat, vivant, ecart }, plan };
}
