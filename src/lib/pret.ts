import "server-only";
import type { SeedData } from "./seed";
import { bucketKey, defaultCycles, parseState, resolveCycleContext, round, type Bucket, type Cycles, type Operation } from "./cycle";

/**
 * Prêt étudiant SGBCI n°101848 — remboursement automatique mensuel. Tableau
 * d'amortissement officiel de la banque (relevé du 13/02/2026), saisi une
 * fois pour toutes. Indépendant des cycles mensuels de Cauris (comme
 * Bourse) : le statut de chaque échéance se déduit de la date du jour.
 * Port de public/app.js:1613-1796 (PRET_INFO/PRET_ECHEANCES/pretSummary/
 * pretMarkPaid/pretUnmark).
 */

export const PRET_INFO = {
  numero: "101848",
  banque: "Société Générale Côte d'Ivoire · agence Riviera Palmeraie",
  montant: 4500000,
  tauxInterets: 7.5,
  tauxAssurance: 1.1,
  fraisDossier: 99000,
  tauxFraisDossier: 10,
  dateMiseEnPlace: "27/01/2025",
  premiereEcheance: "25/02/2025",
  derniereEcheance: "25/01/2030",
  nbEcheances: 60,
};

// [no, date, capital, intérêts (charges + taxe 10%), assurance (Stamvie Allianz/Colina), montant échéance, capital restant dû]
const PRET_ECHEANCES_RAW: [number, string, number, number, number, number, number][] = [
  [2, "25/02/2025", 59116, 29906, 3987, 93009, 4440884],
  [3, "25/03/2025", 59576, 30532, 4071, 94179, 4381308],
  [4, "25/04/2025", 60042, 30121, 4016, 94179, 4321266],
  [5, "25/05/2025", 60509, 29709, 3961, 94179, 4260757],
  [6, "25/06/2025", 60980, 29293, 3906, 94179, 4199777],
  [7, "25/07/2025", 61455, 28874, 3850, 94179, 4138322],
  [8, "25/08/2025", 61934, 28452, 3793, 94179, 4076388],
  [9, "25/09/2025", 62417, 28025, 3737, 94179, 4013971],
  [10, "25/10/2025", 62904, 27596, 3679, 94179, 3951067],
  [11, "25/11/2025", 63394, 27163, 3622, 94179, 3887673],
  [12, "25/12/2025", 63887, 26728, 3564, 94179, 3823786],
  [13, "25/01/2026", 64385, 26289, 3505, 94179, 3759401],
  [14, "25/02/2026", 64887, 25846, 3446, 94179, 3694514],
  [15, "25/03/2026", 65392, 25400, 3387, 94179, 3629122],
  [16, "25/04/2026", 65902, 24950, 3327, 94179, 3563220],
  [17, "25/05/2026", 66416, 24497, 3266, 94179, 3496804],
  [18, "25/06/2026", 66933, 24041, 3205, 94179, 3429871],
  [19, "25/07/2026", 67454, 23581, 3144, 94179, 3362417],
  [20, "25/08/2026", 67980, 23117, 3082, 94179, 3294437],
  [21, "25/09/2026", 68510, 22649, 3020, 94179, 3225927],
  [22, "25/10/2026", 69044, 22178, 2957, 94179, 3156883],
  [23, "25/11/2026", 69581, 21704, 2894, 94179, 3087302],
  [24, "25/12/2026", 70123, 21226, 2830, 94179, 3017179],
  [25, "25/01/2027", 70670, 20743, 2766, 94179, 2946509],
  [26, "25/02/2027", 71220, 20258, 2701, 94179, 2875289],
  [27, "25/03/2027", 71775, 19768, 2636, 94179, 2803514],
  [28, "25/04/2027", 72335, 19274, 2570, 94179, 2731179],
  [29, "25/05/2027", 72898, 18777, 2504, 94179, 2658281],
  [30, "25/06/2027", 73467, 18275, 2437, 94179, 2584814],
  [31, "25/07/2027", 74039, 17771, 2369, 94179, 2510775],
  [32, "25/08/2027", 74616, 17261, 2302, 94179, 2436159],
  [33, "25/09/2027", 75197, 16749, 2233, 94179, 2360962],
  [34, "25/10/2027", 75783, 16232, 2164, 94179, 2285179],
  [35, "25/11/2027", 76374, 15710, 2095, 94179, 2208805],
  [36, "25/12/2027", 76968, 15186, 2025, 94179, 2131837],
  [37, "25/01/2028", 77569, 14656, 1954, 94179, 2054268],
  [38, "25/02/2028", 78173, 14123, 1883, 94179, 1976095],
  [39, "25/03/2028", 78782, 13586, 1811, 94179, 1897313],
  [40, "25/04/2028", 79396, 13044, 1739, 94179, 1817917],
  [41, "25/05/2028", 80015, 12498, 1666, 94179, 1737902],
  [42, "25/06/2028", 80638, 11948, 1593, 94179, 1657264],
  [43, "25/07/2028", 81266, 11394, 1519, 94179, 1575998],
  [44, "25/08/2028", 81899, 10835, 1445, 94179, 1494099],
  [45, "25/09/2028", 82537, 10272, 1370, 94179, 1411562],
  [46, "25/10/2028", 83181, 9704, 1294, 94179, 1328381],
  [47, "25/11/2028", 83829, 9132, 1218, 94179, 1244552],
  [48, "25/12/2028", 84482, 8556, 1141, 94179, 1160070],
  [49, "25/01/2029", 85141, 7975, 1063, 94179, 1074929],
  [50, "25/02/2029", 85804, 7390, 985, 94179, 989125],
  [51, "25/03/2029", 86472, 6800, 907, 94179, 902653],
  [52, "25/04/2029", 87146, 6206, 827, 94179, 815507],
  [53, "25/05/2029", 87824, 5607, 748, 94179, 727683],
  [54, "25/06/2029", 88509, 5003, 667, 94179, 639174],
  [55, "25/07/2029", 89198, 4395, 586, 94179, 549976],
  [56, "25/08/2029", 89894, 3781, 504, 94179, 460082],
  [57, "25/09/2029", 90593, 3164, 422, 94179, 369489],
  [58, "25/10/2029", 91300, 2540, 339, 94179, 278189],
  [59, "25/11/2029", 92011, 1913, 255, 94179, 186178],
  [60, "25/12/2029", 92728, 1280, 171, 94179, 93450],
  [61, "25/01/2030", 93450, 643, 86, 94179, 0],
];

export type PretEcheance = { no: number; date: string; capital: number; interets: number; assurance: number; montant: number; reste: number };

export const PRET_ECHEANCES: PretEcheance[] = PRET_ECHEANCES_RAW.map((r) => ({
  no: r[0],
  date: r[1],
  capital: r[2],
  interets: r[3],
  assurance: r[4],
  montant: r[5],
  reste: r[6],
}));

function parseEcheanceDate(d: string): Date | null {
  const m = /(\d+)\/(\d+)\/(\d+)/.exec(d || "");
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
}

export function pretIsPaid(e: PretEcheance): boolean {
  const dt = parseEcheanceDate(e.date);
  return dt ? dt <= new Date() : false;
}

/** Toutes les opérations liées à une échéance (op._pretNo), quel que soit le cycle — voir pretAllLinks(). */
function allEcheanceLinks(seed: SeedData, state: Record<string, unknown>): { cycleId: string; op: Operation }[] {
  const cycles = parseState<Cycles>(state, "cycles", defaultCycles());
  const ctx = resolveCycleContext(seed, state);
  const out: { cycleId: string; op: Operation }[] = [];
  cycles.months.forEach((m) => {
    const ops = m.id === ctx.M.id ? ctx.newOps : (parseState<Bucket>(state, bucketKey(m.id), {}).newOps ?? []);
    ops.forEach((o) => {
      if (o._pretNo != null) out.push({ cycleId: m.id, op: o });
    });
  });
  return out;
}

export type PretSummary = {
  next: PretEcheance | null;
  resteDu: number;
  rembourse: number;
  pct: number;
  payees: number;
  restantes: number;
};

function computeSummary(paidNos: Set<number>): PretSummary {
  const payees = PRET_ECHEANCES.filter((e) => paidNos.has(e.no));
  const last = payees[payees.length - 1] ?? null;
  const next = PRET_ECHEANCES.find((e) => !paidNos.has(e.no)) ?? null;
  const resteDu = last ? last.reste : PRET_INFO.montant;
  const rembourse = PRET_INFO.montant - resteDu;
  const pct = PRET_INFO.montant > 0 ? (rembourse / PRET_INFO.montant) * 100 : 0;
  return { next, resteDu: round(resteDu), rembourse: round(rembourse), pct: Math.round(pct * 10) / 10, payees: payees.length, restantes: PRET_ECHEANCES.length - payees.length };
}

export type PretResponse = {
  info: typeof PRET_INFO;
  summary: PretSummary;
  echeances: (PretEcheance & { paid: boolean; linked: boolean; current: boolean })[];
};

/**
 * Statut de chaque échéance = date déjà passée OU opération explicitement
 * marquée payée. `linked` (opération réelle créée via "Marquer payé")
 * détermine seule si l'échéance peut être annulée — une échéance payée par
 * simple écoulement de la date (prélèvement bancaire automatique, aucune
 * action de l'utilisateur) n'a rien à annuler. Voir unmarkEcheance().
 */
export function computePret(seed: SeedData, state: Record<string, unknown>): PretResponse {
  const links = allEcheanceLinks(seed, state);
  const linkedNos = new Set(links.map((l) => l.op._pretNo as number));
  const paidNos = new Set(PRET_ECHEANCES.filter((e) => linkedNos.has(e.no) || pretIsPaid(e)).map((e) => e.no));
  const summary = computeSummary(paidNos);
  const echeances = PRET_ECHEANCES.map((e) => ({ ...e, paid: paidNos.has(e.no), linked: linkedNos.has(e.no), current: summary.next?.no === e.no }));
  return { info: PRET_INFO, summary, echeances };
}

export type PretMutationResult = { ok: true; cycleId: string; updatedBucket: Record<string, unknown> } | { ok: false; error: string };

/** Marque une échéance payée : crée la vraie opération de dépense dans le cycle actif. */
export function markEcheancePaid(seed: SeedData, state: Record<string, unknown>, no: number): PretMutationResult {
  const e = PRET_ECHEANCES.find((x) => x.no === no);
  if (!e) return { ok: false, error: "Échéance introuvable." };
  const links = allEcheanceLinks(seed, state);
  if (links.some((l) => l.op._pretNo === no)) return { ok: false, error: "Échéance déjà marquée payée." };

  const ctx = resolveCycleContext(seed, state);
  const day = (e.date.split("/")[0] || "").padStart(2, "0");
  const now = Date.now();
  const op: Operation = {
    date: `${day}/${ctx.M.mm}`,
    lib: `Prêt SGBCI — échéance n°${e.no}`,
    type: "dépense",
    compte: "Banque (SGBCI)",
    cat: "Prêt étudiant",
    montant: -e.montant,
    note: `Capital ${round(e.capital)} F · intérêts ${round(e.interets)} F · assurance ${round(e.assurance)} F · capital restant dû ${round(e.reste)} F`,
    _pretNo: e.no,
    _ts: now,
    _t: new Date(now).toTimeString().slice(0, 5),
  };
  const rawBucket = (state[bucketKey(ctx.M.id)] as Record<string, unknown>) ?? {};
  const existing = Array.isArray(rawBucket.newOps) ? (rawBucket.newOps as Operation[]) : [];
  return { ok: true, cycleId: ctx.M.id, updatedBucket: { ...rawBucket, newOps: [...existing, op] } };
}

/** Retire l'opération liée à une échéance (annule le marquage), dans le cycle où elle vit réellement. */
export function unmarkEcheance(seed: SeedData, state: Record<string, unknown>, no: number): PretMutationResult {
  const link = allEcheanceLinks(seed, state).find((l) => l.op._pretNo === no);
  if (!link) return { ok: false, error: "Aucune opération liée à cette échéance." };

  const rawBucket = (state[bucketKey(link.cycleId)] as Record<string, unknown>) ?? {};
  const existing = Array.isArray(rawBucket.newOps) ? (rawBucket.newOps as Operation[]) : [];
  const filtered = existing.filter((o) => o._pretNo !== no);
  return { ok: true, cycleId: link.cycleId, updatedBucket: { ...rawBucket, newOps: filtered } };
}
