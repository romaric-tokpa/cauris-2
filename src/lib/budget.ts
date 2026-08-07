import "server-only";
import type { SeedData } from "./seed";
import { resolveCycleContext, round, defaultCycles, parseState, type Cycles } from "./cycle";

/** Budget par catégorie — voir renderBudget() dans public/app.js pour l'équivalent client. */

function budgetCatKey(rawCat: string): string {
  const norm = (rawCat || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
  if (/^pret\b/.test(norm)) return "Prêt étudiant";
  return rawCat;
}

export type BudgetRow = {
  cat: string;
  budget: number;
  spent: number;
  pct: number;
  status: "over" | "at" | "ok";
};

export type BudgetResponse = {
  monthLabel: string;
  totals: { budget: number; spent: number; restant: number } | null;
  rows: BudgetRow[];
  unbudgeted: { cat: string; spent: number }[];
};

export function computeBudget(seed: SeedData, state: Record<string, unknown>): BudgetResponse {
  const ctx = resolveCycleContext(seed, state);
  const budgets = ctx.cycles.budgets ?? {};
  const spent: Record<string, number> = {};
  ctx.liveCategories().forEach((c) => {
    const k = budgetCatKey(c.label);
    spent[k] = (spent[k] || 0) + c.value;
  });

  const budgetedCats = Object.keys(budgets);
  const totBudget = budgetedCats.reduce((s, c) => s + budgets[c], 0);
  const totSpent = budgetedCats.reduce((s, c) => s + (spent[c] || 0), 0);

  const rows: BudgetRow[] = budgetedCats.map((cat) => {
    const bud = budgets[cat];
    const sp = spent[cat] || 0;
    const pct = bud ? Math.min(100, (sp / bud) * 100) : 0;
    const status: BudgetRow["status"] = sp > bud ? "over" : sp >= bud * 0.9 ? "at" : "ok";
    return { cat, budget: round(bud), spent: round(sp), pct: Math.round(pct * 10) / 10, status };
  });

  const unbudgeted = Object.keys(spent)
    .filter((c) => !budgets[c] && spent[c] > 0)
    .sort((a, b) => spent[b] - spent[a])
    .map((cat) => ({ cat, spent: round(spent[cat]) }));

  return {
    monthLabel: ctx.M.label,
    totals: budgetedCats.length ? { budget: round(totBudget), spent: round(totSpent), restant: round(totBudget - totSpent) } : null,
    rows,
    unbudgeted,
  };
}

export type BudgetMutationResult = { ok: true; cycles: Cycles } | { ok: false; error: string };

/** Crée ou met à jour le budget mensuel d'une catégorie (global, comme cycles.placements). */
export function upsertBudget(state: Record<string, unknown>, cat: string, montant: number): BudgetMutationResult {
  const name = (cat || "").trim();
  if (!name) return { ok: false, error: "Catégorie manquante." };
  if (!Number.isFinite(montant) || montant < 0) return { ok: false, error: "Montant invalide." };
  const cycles = parseState<Cycles>(state, "cycles", defaultCycles());
  const budgets = { ...(cycles.budgets ?? {}), [name]: round(montant) };
  return { ok: true, cycles: { ...cycles, budgets } };
}

/** Retire le budget d'une catégorie (elle redevient une dépense non budgétée). */
export function deleteBudget(state: Record<string, unknown>, cat: string): BudgetMutationResult {
  const cycles = parseState<Cycles>(state, "cycles", defaultCycles());
  const budgets = { ...(cycles.budgets ?? {}) };
  delete budgets[cat];
  return { ok: true, cycles: { ...cycles, budgets } };
}
