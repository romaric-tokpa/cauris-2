import "server-only";
import type { SeedData } from "./seed";
import { bucketKey, defaultCycles, parseState, resolveCycleContext, round, type Bucket, type Compte, type Cycles, type Operation, type PricePoint } from "./cycle";

/** Portefeuille BRVM — voir renderBourse()/brvmAcct()/collectBrvmOps() dans public/app.js. */

function parseDate(d?: string): number {
  const m = (d || "").match(/(\d+)\/(\d+)/);
  return m ? Number(m[2]) * 100 + Number(m[1]) : 0;
}

export type PositionItem = {
  code: string;
  nom?: string;
  quantite: number;
  pru: number;
  coursActuel: number;
  valorisation: number;
  plusValue: number;
  plusValuePct: number;
  priceHistory: PricePoint[];
};

export type BourseOp = {
  type: "achat_titre" | "vente_titre" | "dividende";
  lib?: string;
  date?: string;
  compte: string;
  montant: number;
  note?: string;
  monthLabel: string;
};

export type BourseSeriesPoint = { date: string; valo: number; invest: number };

export type BourseResponse = {
  valorisation: number;
  investi: number;
  plusValue: number;
  plusValuePct: number;
  dividendes: number;
  rendementPct: number;
  liquidites: number;
  liquiditesCompte?: string;
  positions: PositionItem[];
  historique: BourseOp[];
  series: BourseSeriesPoint[];
};

/** Quantité d'une valeur détenue à l'instant T, reconstituée depuis les ops — voir brvmQtyHeldAt() dans public/app.js:390-392. */
function qtyHeldAt(ops: Operation[], code: string, ts: number): number {
  let q = 0;
  ops.forEach((o) => {
    if (o.titre !== code || (o._ts || 0) > ts) return;
    if (o.type === "achat_titre") q += Number(o.qte) || 0;
    else if (o.type === "vente_titre") q -= Number(o.qte) || 0;
  });
  return q;
}

/** Série d'évolution du portefeuille (valorisation vs investi), un point par relevé de cours — voir portfolioSeries() dans public/app.js:395-411. */
function computePortfolioSeries(cycles: Cycles, state: Record<string, unknown>, ctx: ReturnType<typeof resolveCycleContext>): BourseSeriesPoint[] {
  const rawAcct = (cycles.placements ?? []).find((c) => c.type === "placement");
  if (!rawAcct?.priceHistory) return [];
  const ph = rawAcct.priceHistory;
  const codes = Object.keys(ph);
  const pru: Record<string, number> = {};
  (rawAcct.positions ?? []).forEach((p) => (pru[p.code] = p.pru));

  const ops: Operation[] = [];
  cycles.months.forEach((m) => {
    const newOps = m.id === ctx.M.id ? ctx.newOps : (parseState<Bucket>(state, bucketKey(m.id), {}).newOps ?? []);
    newOps.forEach((o) => {
      if (o.type === "achat_titre" || o.type === "vente_titre") ops.push(o);
    });
  });

  const events: { code: string; cours: number; date: string; ts: number }[] = [];
  codes.forEach((code) => (ph[code] ?? []).forEach((pt) => events.push({ code, cours: pt.cours, date: pt.date, ts: pt.ts })));
  events.sort((a, b) => (a.ts || 0) - (b.ts || 0));

  const lastCours: Record<string, number> = {};
  const samples: { date: string; ts: number; valo: number; invest: number }[] = [];
  events.forEach((ev) => {
    lastCours[ev.code] = ev.cours;
    let valo = 0;
    let invest = 0;
    codes.forEach((code) => {
      const q = qtyHeldAt(ops, code, ev.ts);
      if (q > 0) {
        valo += q * (lastCours[code] || 0);
        invest += q * (pru[code] != null ? pru[code] : lastCours[code] || 0);
      }
    });
    samples.push({ date: ev.date, ts: ev.ts, valo, invest });
  });

  const out: typeof samples = [];
  samples.forEach((s) => {
    const prev = out[out.length - 1];
    if (prev && prev.date === s.date) out[out.length - 1] = s;
    else out.push(s);
  });
  return out.map((s) => ({ date: s.date, valo: round(s.valo), invest: round(s.invest) }));
}

export function computeBourse(seed: SeedData, state: Record<string, unknown>): BourseResponse {
  const ctx = resolveCycleContext(seed, state);
  const acct = ctx.liveComptes().find((c) => c.type === "placement");
  const positionsRaw = acct?.positions ?? [];

  const valorisation = positionsRaw.reduce((s, p) => s + (Number(p.quantite) || 0) * (Number(p.coursActuel) || 0), 0);
  const investi = positionsRaw.reduce((s, p) => s + (Number(p.quantite) || 0) * (Number(p.pru) || 0), 0);
  const plusValue = valorisation - investi;
  const plusValuePct = investi > 0 ? (plusValue / investi) * 100 : 0;

  const cycles = parseState<Cycles>(state, "cycles", defaultCycles());
  const rawAcct = (cycles.placements ?? []).find((c) => c.type === "placement");
  const cashName = rawAcct?.compteEspeces;
  const cashAcct = cashName ? ctx.liveComptes().find((c) => c.nom === cashName) : undefined;

  const historique: BourseOp[] = [];
  cycles.months.forEach((m) => {
    const newOps = m.id === ctx.M.id ? ctx.newOps : (parseState<Bucket>(state, bucketKey(m.id), {}).newOps ?? []);
    newOps.forEach((o) => {
      if (o.type === "achat_titre" || o.type === "vente_titre" || o.type === "dividende") {
        historique.push({ type: o.type, lib: o.lib, date: o.date, compte: o.compte, montant: round(o.montant), note: o.note, monthLabel: m.label });
      }
    });
  });
  historique.sort((a, b) => parseDate(b.date) - parseDate(a.date));

  const dividendes = historique.filter((o) => o.type === "dividende").reduce((s, o) => s + Math.abs(o.montant), 0);
  const rendementPct = investi > 0 ? (dividendes / investi) * 100 : 0;

  const positions: PositionItem[] = positionsRaw.map((p) => {
    const v = (Number(p.quantite) || 0) * (Number(p.coursActuel) || 0);
    const c = (Number(p.quantite) || 0) * (Number(p.pru) || 0);
    const pl = v - c;
    return {
      code: p.code,
      nom: p.nom,
      quantite: Number(p.quantite) || 0,
      pru: round(Number(p.pru) || 0),
      coursActuel: round(Number(p.coursActuel) || 0),
      valorisation: round(v),
      plusValue: round(pl),
      plusValuePct: c > 0 ? Math.round((pl / c) * 1000) / 10 : 0,
      priceHistory: acct?.priceHistory?.[p.code] ?? [],
    };
  });

  return {
    valorisation: round(valorisation),
    investi: round(investi),
    plusValue: round(plusValue),
    plusValuePct: Math.round(plusValuePct * 10) / 10,
    dividendes: round(dividendes),
    rendementPct: Math.round(rendementPct * 100) / 100,
    liquidites: round(cashAcct?.solde ?? 0),
    liquiditesCompte: cashAcct?.nom,
    positions,
    historique,
    series: computePortfolioSeries(cycles, state, ctx),
  };
}

/* ============================================================
   ÉCRITURE — achat/vente/dividende, port de ensurePlacement()/
   recordAchatTitre()/recordVenteTitre()/recordDividende() dans
   public/app.js:249-301. Les titres vivent dans cycles.placements
   (global, hors cycles) ; seul le cash bouge via une opération
   dans le bucket du cycle actif — voir liveComptes() dans cycle.ts.
   ============================================================ */

function hhmm(): string {
  return new Date().toTimeString().slice(0, 5);
}

function clonePlacements(cycles: Cycles): Compte[] {
  return (cycles.placements ?? []).map((p) => ({
    ...p,
    positions: (p.positions ?? []).map((x) => ({ ...x })),
    priceHistory: p.priceHistory ? Object.fromEntries(Object.entries(p.priceHistory).map(([code, arr]) => [code, arr.map((pt) => ({ ...pt }))])) : undefined,
  }));
}

/** Historise un relevé de cours : un point par jour, on remplace le dernier point si même date — voir pushPricePoint() dans public/app.js:258-265. */
function pushPricePoint(acct: Compte, code: string, cours: number, date: string, ts: number): void {
  if (!acct.priceHistory) acct.priceHistory = {};
  const arr = acct.priceHistory[code] ?? (acct.priceHistory[code] = []);
  const last = arr[arr.length - 1];
  if (last && last.date === date) {
    last.cours = Number(cours) || 0;
    last.ts = ts;
  } else {
    arr.push({ cours: Number(cours) || 0, date, ts });
  }
  arr.sort((a, b) => (a.ts || 0) - (b.ts || 0));
}

function pushNewOps(state: Record<string, unknown>, cycleId: string, entries: Operation[]): Record<string, unknown> {
  const rawBucket = (state[bucketKey(cycleId)] as Record<string, unknown>) ?? {};
  const existing = Array.isArray(rawBucket.newOps) ? (rawBucket.newOps as Operation[]) : [];
  return { ...rawBucket, newOps: [...existing, ...entries] };
}

export type BourseTradeResult =
  | { ok: true; cycleId: string; cycles: Cycles; updatedBucket: Record<string, unknown> }
  | { ok: false; error: string };

export type AchatInput = {
  code: string;
  nom?: string;
  quantite: number;
  prixUnitaire: number;
  coursActuel?: number;
  frais?: number;
  compte: string;
  date: string;
  portefeuille?: string;
};

/** Achat : sort le cash du compte source, crée/augmente la position (PRU moyen pondéré, hors frais). */
export function recordAchat(seed: SeedData, state: Record<string, unknown>, input: AchatInput): BourseTradeResult {
  const code = (input.code || "").trim().toUpperCase();
  const qty = Number(input.quantite) || 0;
  const pu = Number(input.prixUnitaire) || 0;
  if (!code) return { ok: false, error: "Code manquant." };
  if (qty <= 0) return { ok: false, error: "Quantité invalide." };
  if (pu <= 0) return { ok: false, error: "Prix unitaire invalide." };
  if (!(input.date || "").trim()) return { ok: false, error: "Date manquante." };

  const ctx = resolveCycleContext(seed, state);
  const validNames = ctx.baseComptes().filter((c) => c.type !== "placement").map((c) => c.nom);
  if (!validNames.includes(input.compte)) return { ok: false, error: "Compte source inconnu." };

  const portefeuille = input.portefeuille || "Portefeuille BRVM";
  const placements = clonePlacements(ctx.cycles);
  let acct = placements.find((p) => p.nom === portefeuille);
  if (!acct) {
    acct = { nom: portefeuille, type: "placement", solde: 0, positions: [] };
    placements.push(acct);
  }
  if (!acct.positions) acct.positions = [];
  const coursActuel = input.coursActuel != null ? Number(input.coursActuel) : pu;
  const pos = acct.positions.find((p) => p.code === code);
  if (pos) {
    const totCost = pos.quantite * pos.pru + qty * pu;
    pos.quantite += qty;
    pos.pru = pos.quantite ? Math.round((totCost / pos.quantite) * 100) / 100 : 0;
    if (input.coursActuel != null) pos.coursActuel = coursActuel;
  } else {
    acct.positions.push({ code, nom: input.nom || code, quantite: qty, pru: pu, coursActuel });
  }

  const now = Date.now();
  const gid = `t${now}`;
  const cout = qty * pu;
  const frais = Math.abs(Number(input.frais) || 0);
  const date = input.date.trim();
  pushPricePoint(acct, code, pu, date, now);
  const entries: Operation[] = [
    {
      date,
      lib: `Achat ${qty} × ${input.nom || code}`,
      type: "achat_titre",
      compte: input.compte,
      cat: "",
      montant: -cout,
      note: `PRU ${round(pu)} · ${code}`,
      titre: code,
      qte: qty,
      _xlink: gid,
      _ts: now,
      _t: hhmm(),
    },
  ];
  if (frais > 0) {
    entries.push({
      date,
      lib: `Frais — Achat ${code}`,
      type: "dépense",
      compte: input.compte,
      cat: "Frais",
      montant: -frais,
      note: "Frais de courtage",
      _xlink: gid,
      _ts: now - 1,
      _t: hhmm(),
    });
  }

  return { ok: true, cycleId: ctx.M.id, cycles: { ...ctx.cycles, placements }, updatedBucket: pushNewOps(state, ctx.M.id, entries) };
}

export type VenteInput = {
  code: string;
  quantite: number;
  prixUnitaire: number;
  frais?: number;
  compte: string;
  date: string;
  portefeuille?: string;
};

/** Vente : réduit/solde une position, rentre le cash brut sur le compte dest, frais en dépense séparée. */
export function recordVente(seed: SeedData, state: Record<string, unknown>, input: VenteInput): BourseTradeResult {
  const code = (input.code || "").trim().toUpperCase();
  const qtyReq = Number(input.quantite) || 0;
  const pu = Number(input.prixUnitaire) || 0;
  if (!code) return { ok: false, error: "Code manquant." };
  if (qtyReq <= 0) return { ok: false, error: "Quantité invalide." };
  if (pu <= 0) return { ok: false, error: "Prix unitaire invalide." };
  if (!(input.date || "").trim()) return { ok: false, error: "Date manquante." };

  const ctx = resolveCycleContext(seed, state);
  const validNames = ctx.baseComptes().filter((c) => c.type !== "placement").map((c) => c.nom);
  if (!validNames.includes(input.compte)) return { ok: false, error: "Compte destination inconnu." };

  const portefeuille = input.portefeuille || "Portefeuille BRVM";
  const placements = clonePlacements(ctx.cycles);
  const acct = placements.find((p) => p.nom === portefeuille);
  const pos = acct?.positions?.find((p) => p.code === code);
  if (!acct || !pos) return { ok: false, error: "Position introuvable." };

  const qty = Math.min(qtyReq, pos.quantite);
  const frais = Math.abs(Number(input.frais) || 0);
  const brut = qty * pu;
  const net = brut - frais;
  const plReal = Math.round(qty * (pu - pos.pru) * 100) / 100;
  pos.quantite -= qty;
  if (pos.quantite <= 0) acct.positions = (acct.positions ?? []).filter((p) => p !== pos);

  const now = Date.now();
  const gid = `t${now}`;
  const date = input.date.trim();
  const entries: Operation[] = [
    {
      date,
      lib: `Vente ${qty} × ${pos.nom || code}`,
      type: "vente_titre",
      compte: input.compte,
      cat: "",
      montant: brut,
      note: `Net ${round(net)} F · +/- value ${plReal >= 0 ? "+" : "−"}${round(Math.abs(plReal))} F`,
      titre: code,
      qte: qty,
      _xlink: gid,
      _ts: now,
      _t: hhmm(),
    },
  ];
  if (frais > 0) {
    entries.push({
      date,
      lib: `Frais — Vente ${code}`,
      type: "dépense",
      compte: input.compte,
      cat: "Frais",
      montant: -frais,
      note: "Frais de courtage",
      _xlink: gid,
      _ts: now - 1,
      _t: hhmm(),
    });
  }

  return { ok: true, cycleId: ctx.M.id, cycles: { ...ctx.cycles, placements }, updatedBucket: pushNewOps(state, ctx.M.id, entries) };
}

export type DividendeInput = { code: string; montant: number; compte: string; date: string; lib?: string };

/** Dividende : entre du cash en revenu (catégorie « Dividendes »), aucune position à modifier. */
export function recordDividende(seed: SeedData, state: Record<string, unknown>, input: DividendeInput): BourseTradeResult {
  const code = (input.code || "").trim().toUpperCase();
  const montant = Math.abs(Number(input.montant) || 0);
  if (!code) return { ok: false, error: "Code manquant." };
  if (montant <= 0) return { ok: false, error: "Montant invalide." };
  if (!(input.date || "").trim()) return { ok: false, error: "Date manquante." };

  const ctx = resolveCycleContext(seed, state);
  const validNames = ctx.baseComptes().filter((c) => c.type !== "placement").map((c) => c.nom);
  if (!validNames.includes(input.compte)) return { ok: false, error: "Compte destination inconnu." };

  const date = input.date.trim();
  const entries: Operation[] = [
    { date, lib: input.lib || `Dividende ${code}`, type: "dividende", compte: input.compte, cat: "Dividendes", montant, note: "", _ts: Date.now(), _t: hhmm() },
  ];

  return { ok: true, cycleId: ctx.M.id, cycles: ctx.cycles, updatedBucket: pushNewOps(state, ctx.M.id, entries) };
}

export type UpdateCoursResult = { ok: true; cycles: Cycles } | { ok: false; error: string };

export type UpdateCoursInput = { code: string; cours: number; date: string; portefeuille?: string };

/** Mise à jour manuelle du cours d'une position, avec historisation — voir updateCours() dans public/app.js:385-388. */
export function updateCoursActuel(seed: SeedData, state: Record<string, unknown>, input: UpdateCoursInput): UpdateCoursResult {
  const code = (input.code || "").trim().toUpperCase();
  const cours = Number(input.cours) || 0;
  if (!code) return { ok: false, error: "Code manquant." };
  if (cours <= 0) return { ok: false, error: "Cours invalide." };
  if (!(input.date || "").trim()) return { ok: false, error: "Date manquante." };

  const ctx = resolveCycleContext(seed, state);
  const portefeuille = input.portefeuille || "Portefeuille BRVM";
  const placements = clonePlacements(ctx.cycles);
  const acct = placements.find((p) => p.nom === portefeuille);
  const pos = acct?.positions?.find((p) => p.code === code);
  if (!acct || !pos) return { ok: false, error: "Position introuvable." };

  pos.coursActuel = cours;
  pushPricePoint(acct, code, cours, input.date.trim(), Date.now());

  return { ok: true, cycles: { ...ctx.cycles, placements } };
}
