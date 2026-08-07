import "server-only";
import type { SeedData } from "./seed";
import { bucketKey, defaultCycles, parseState, resolveCycleContext, resolvedOpsForMonth, round, type Bucket, type CycleMonth, type Cycles, type Operation } from "./cycle";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Suivi mensuel — voir renderPilot()/monthTotals() dans public/app.js pour l'équivalent client. */

function categoriesFrom(ops: Operation[], type: "dépense" | "revenu"): { label: string; value: number }[] {
  const m: Record<string, number> = {};
  ops
    .filter((o) => o.type === type)
    .forEach((o) => {
      const l = type === "revenu" ? o.cat || o.lib || "Divers" : o.cat || "Divers";
      m[l] = (m[l] || 0) + Math.abs(o.montant);
    });
  return Object.entries(m)
    .map(([label, value]) => ({ label, value: round(value) }))
    .sort((a, b) => b.value - a.value);
}

export type PilotMonth = {
  id: string;
  label: string;
  isActive: boolean;
  revenu: number;
  depense: number;
  net: number;
  tauxPct: number;
  depCategories: { label: string; value: number }[];
  revCategories: { label: string; value: number }[];
};

export type PilotResponse = {
  months: PilotMonth[];
  totals: { revenu: number; depense: number; net: number };
};

export function computePilot(seed: SeedData, state: Record<string, unknown>): PilotResponse {
  const cycles = parseState<Cycles>(state, "cycles", defaultCycles());
  const sorted = [...cycles.months].sort((a, b) => (a.id < b.id ? -1 : 1));

  const months: PilotMonth[] = sorted.map((meta) => {
    const ops = resolvedOpsForMonth(seed, state, meta);
    const depense = ops.filter((o) => o.type === "dépense").reduce((s, o) => s + Math.abs(o.montant), 0);
    const revenu = ops.filter((o) => o.type === "revenu" || o.type === "dividende").reduce((s, o) => s + Math.abs(o.montant), 0);
    const net = revenu - depense;
    return {
      id: meta.id,
      label: meta.label,
      isActive: meta.id === cycles.activeId,
      revenu: round(revenu),
      depense: round(depense),
      net: round(net),
      tauxPct: revenu > 0 ? Math.round((net / revenu) * 1000) / 10 : 0,
      depCategories: categoriesFrom(ops, "dépense"),
      revCategories: categoriesFrom(ops, "revenu"),
    };
  });

  const totals = months.reduce(
    (acc, m) => ({ revenu: acc.revenu + m.revenu, depense: acc.depense + m.depense, net: acc.net + m.net }),
    { revenu: 0, depense: 0, net: 0 },
  );

  return { months, totals };
}

export type AnnualMonth = {
  mm: string;
  monthName: string;
  label: string;
  hasData: boolean;
  revenu: number;
  depense: number;
  net: number;
  tauxPct: number;
};

export type AnnualCategory = { label: string; value: number; pct: number };

export type AnnualResponse = {
  year: number;
  availableYears: number[];
  months: AnnualMonth[];
  totals: { revenu: number; depense: number; net: number; tauxPct: number };
  depCategories: AnnualCategory[];
  revCategories: AnnualCategory[];
  bestMonth: AnnualMonth | null;
  worstMonth: AnnualMonth | null;
  monthsWithData: number;
};

function toAnnualCategories(totals: Record<string, number>): AnnualCategory[] {
  const total = Object.values(totals).reduce((s, v) => s + v, 0);
  return Object.entries(totals)
    .map(([label, value]) => ({ label, value: round(value), pct: total > 0 ? Math.round((value / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.value - a.value);
}

/** Cumul annuel Janvier→Décembre — un mois du plan par cycle existant, sinon vide (pas encore atteint). */
export function computeAnnualAnalysis(seed: SeedData, state: Record<string, unknown>, year: number): AnnualResponse {
  const cycles = parseState<Cycles>(state, "cycles", defaultCycles());
  const availableYears = Array.from(new Set(cycles.months.map((m) => m.year))).sort((a, b) => a - b);

  const depCatTotals: Record<string, number> = {};
  const revCatTotals: Record<string, number> = {};
  let totalRevenu = 0;
  let totalDepense = 0;

  const months: AnnualMonth[] = MONTHS.map((monthName, i) => {
    const mm = String(i + 1).padStart(2, "0");
    const meta = cycles.months.find((m) => m.year === year && m.mm === mm);
    if (!meta) {
      return { mm, monthName, label: `${cap(monthName)} ${year}`, hasData: false, revenu: 0, depense: 0, net: 0, tauxPct: 0 };
    }
    const ops = resolvedOpsForMonth(seed, state, meta);
    const depense = round(ops.filter((o) => o.type === "dépense").reduce((s, o) => s + Math.abs(o.montant), 0));
    const revenu = round(ops.filter((o) => o.type === "revenu" || o.type === "dividende").reduce((s, o) => s + Math.abs(o.montant), 0));
    const net = revenu - depense;
    categoriesFrom(ops, "dépense").forEach((c) => {
      depCatTotals[c.label] = (depCatTotals[c.label] || 0) + c.value;
    });
    categoriesFrom(ops, "revenu").forEach((c) => {
      revCatTotals[c.label] = (revCatTotals[c.label] || 0) + c.value;
    });
    totalRevenu += revenu;
    totalDepense += depense;
    return { mm, monthName, label: meta.label, hasData: true, revenu, depense, net, tauxPct: revenu > 0 ? Math.round((net / revenu) * 1000) / 10 : 0 };
  });

  const totalNet = totalRevenu - totalDepense;
  const withData = months.filter((m) => m.hasData);
  const bestMonth = withData.length ? withData.reduce((a, b) => (b.net > a.net ? b : a)) : null;
  const worstMonth = withData.length ? withData.reduce((a, b) => (b.net < a.net ? b : a)) : null;

  return {
    year,
    availableYears,
    months,
    totals: {
      revenu: round(totalRevenu),
      depense: round(totalDepense),
      net: round(totalNet),
      tauxPct: totalRevenu > 0 ? Math.round((totalNet / totalRevenu) * 1000) / 10 : 0,
    },
    depCategories: toAnnualCategories(depCatTotals),
    revCategories: toAnnualCategories(revCatTotals),
    bestMonth,
    worstMonth,
    monthsWithData: withData.length,
  };
}

export type CloseCycleResult =
  | { ok: true; cycles: Cycles; newCycleId: string; newBucket: Record<string, unknown> | null; alreadyExists: boolean }
  | { ok: false; error: string };

/**
 * Clôture le cycle actif et démarre le suivant : reporte les soldes de
 * comptes/coffres comme point de départ (`opening`), le cycle clos reste
 * consultable dans l'historique. Port de newCycle() dans public/app.js:1536-1550.
 */
export function closeActiveCycle(seed: SeedData, state: Record<string, unknown>): CloseCycleResult {
  const ctx = resolveCycleContext(seed, state);
  const { M, cycles } = ctx;

  let y = M.year;
  let mi = parseInt(M.mm, 10) + 1;
  if (mi > 12) {
    mi = 1;
    y++;
  }
  const mm = String(mi).padStart(2, "0");
  const id = `${y}-${mm}`;

  const existing = cycles.months.find((m) => m.id === id);
  if (existing) {
    return { ok: true, cycles: { ...cycles, activeId: id }, newCycleId: id, newBucket: null, alreadyExists: true };
  }

  const closing = ctx.liveComptes();
  const coffresClose = ctx.liveCoffres().map((c) => ({ nom: c.nom, epargne: round(c.epargne), objectif: c.objectif, bloque: c.bloque, note: "" }));

  const meta: CycleMonth = {
    id,
    label: `${cap(MONTHS[mi - 1])} ${y}`,
    mm,
    year: y,
    monthName: MONTHS[mi - 1],
    seed: false,
    opening: {
      comptes: closing.filter((c) => c.type !== "placement").map((c) => ({ nom: c.nom, solde: round(c.solde), type: c.type, note: c.note || "" })),
      coffres: coffresClose,
    },
  };

  const updatedCycles: Cycles = { ...cycles, months: [...cycles.months, meta], activeId: id };
  const newBucket: Bucket = { newOps: [], dettePaid: {}, coffreOverrides: { ...ctx.coffreOverrides } };
  return { ok: true, cycles: updatedCycles, newCycleId: id, newBucket, alreadyExists: false };
}

export type SwitchCycleResult = { ok: true; cycles: Cycles } | { ok: false; error: string };

/**
 * Change le cycle actif sans le clôturer (consultation/saisie sur un cycle
 * existant, passé ou futur). Port de switchMonth() dans public/app.js:1528-1534.
 */
export function switchActiveCycle(state: Record<string, unknown>, cycleId: string): SwitchCycleResult {
  const cycles = parseState<Cycles>(state, "cycles", defaultCycles());
  if (!cycles.months.find((m) => m.id === cycleId)) return { ok: false, error: "Cycle introuvable." };
  return { ok: true, cycles: { ...cycles, activeId: cycleId } };
}
