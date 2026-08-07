import "server-only";
import type { SeedData } from "./seed";

/**
 * Port serveur du moteur de cycles/comptes de public/app.js, partagé par les
 * endpoints qui recalculent l'état pour les clients qui n'exécutent pas
 * app.js (l'app mobile). Le web reste la référence : ces fonctions doivent
 * rester en phase avec setActive()/liveComptes()/liveKpis() côté client.
 */

export type Position = { code: string; nom?: string; quantite: number; pru: number; coursActuel: number };
export type PricePoint = { cours: number; date: string; ts: number };
export type Compte = { nom: string; solde: number; type: string; note?: string; positions?: Position[]; compteEspeces?: string; priceHistory?: Record<string, PricePoint[]> };
export type Coffre = { nom: string; objectif: number; epargne: number; bloque: boolean; note?: string };
export type OpType = "dépense" | "revenu" | "virement" | "achat_titre" | "dividende" | "vente_titre";
export type Operation = {
  date?: string;
  lib?: string;
  type: OpType;
  compte: string;
  compteDest?: string;
  cat?: string;
  montant: number;
  note?: string;
  titre?: string;
  qte?: number;
  _ts?: number;
  _t?: string;
  _xlink?: string;
  _pretNo?: number;
};
export type CycleMonth = {
  id: string;
  label: string;
  mm: string;
  year: number;
  monthName: string;
  seed?: boolean;
  opening?: { comptes: Compte[]; coffres: Coffre[] };
  archive?: Operation[];
};
export type Cycles = {
  activeId: string;
  months: CycleMonth[];
  placements?: Compte[];
  budgets?: Record<string, number>;
  customComptes?: Compte[];
  customCoffres?: Coffre[];
};
export type UserDette = {
  id: string;
  nom: string;
  montant: number;
  retrait?: string;
  echeance?: string;
  paid?: boolean;
  manual?: boolean;
  repayDate?: string;
  repayMonth?: string;
};
export type Bucket = {
  newOps?: Operation[];
  coffreOverrides?: Record<string, number>;
  opOverrides?: Record<string, Operation>;
  opDeletes?: number[];
  dettePaid?: Record<string, boolean>;
  userDettes?: UserDette[];
};

export const norm = (s: string) => (s || "").toLowerCase().replace(/coffre|\(.*?\)/g, "").replace(/[^a-zàâçéèêëîïôûùüÿñæœ' ]/g, "").trim();
export const round = (n: number) => Math.round(n);

export function positionsValue(c: Compte): number {
  return (c.positions ?? []).reduce((s, p) => s + (Number(p.quantite) || 0) * (Number(p.coursActuel) || 0), 0);
}

export function parseState<T>(state: Record<string, unknown>, key: string, fallback: T): T {
  const raw = state[key];
  return raw != null ? (raw as T) : fallback;
}

export function defaultCycles(): Cycles {
  return { activeId: "2026-06", months: [{ id: "2026-06", label: "Juin 2026", mm: "06", year: 2026, monthName: "juin", seed: true }] };
}

export function bucketKey(cycleId: string): string {
  return `m-${cycleId}`;
}

/** Opérations résolues (archivées + overrides/deletes + ajoutées) d'un mois donné, actif ou non — voir monthOps() côté client. */
export function resolvedOpsForMonth(seed: SeedData, state: Record<string, unknown>, meta: CycleMonth): Operation[] {
  const bucket = parseState<Bucket>(state, bucketKey(meta.id), {});
  const opOverrides = bucket.opOverrides ?? {};
  const opDeletes = bucket.opDeletes ?? [];
  const raw = meta.seed ? seed.operations : meta.archive ?? [];
  const archived = raw
    .map((o, i) => {
      if (opDeletes.includes(i)) return null;
      return opOverrides[String(i)] ?? o;
    })
    .filter((o): o is Operation => o != null);
  return [...archived, ...(bucket.newOps ?? [])];
}

export function resolveCycleContext(seed: SeedData, state: Record<string, unknown>) {
  const cycles = parseState<Cycles>(state, "cycles", defaultCycles());
  const M = cycles.months.find((m) => m.id === cycles.activeId) ?? cycles.months[0];
  const bucket = parseState<Bucket>(state, bucketKey(M.id), {});
  const newOps = bucket.newOps ?? [];
  const opOverrides = bucket.opOverrides ?? {};
  const opDeletes = bucket.opDeletes ?? [];
  const coffreOverrides = bucket.coffreOverrides ?? {};
  const globalPlacements = cycles.placements ?? [];

  /*
   * `customComptes`/`customCoffres` ne portent que le solde INITIAL d'un
   * compte/coffre créé après coup (voir createAccount()/createCoffre()) : dès
   * qu'un cycle se clôture, son solde vécu est reporté comme n'importe quel
   * autre compte dans `opening.comptes`/`opening.coffres` du nouveau mois —
   * qui doit alors prévaloir. `custom` passe donc EN PREMIER dans le concat :
   * liveComptes()/liveCoffres() indexent par nom et gardent la DERNIÈRE
   * entrée rencontrée, donc l'entrée de mois (plus fraîche) écrase la
   * référence "custom" si les deux existent — sinon le solde repartait à sa
   * valeur de création à chaque clôture, quels que soient les mouvements
   * réels de la période.
   */
  function baseComptes(): Compte[] {
    const monthComptes = (M.seed ? seed.comptes : M.opening?.comptes ?? []).filter((c) => c.type !== "placement").map((c) => ({ ...c }));
    const placements = globalPlacements.map((c) => ({ ...c, solde: positionsValue(c) }));
    const custom = (cycles.customComptes ?? []).map((c) => ({ ...c }));
    // dédoublonne par nom (custom en premier, monthComptes l'emporte en cas de collision) : les consommateurs directs
    // de baseComptes() (ex. liste de comptes d'operations.ts) n'ont pas de dédup à eux, contrairement à liveComptes().
    const map = new Map<string, Compte>();
    custom.concat(monthComptes, placements).forEach((c) => map.set(c.nom, c));
    return Array.from(map.values());
  }
  function baseCoffres(): Coffre[] {
    const seeded = (M.seed ? seed.coffres : M.opening?.coffres ?? []).map((c) => ({ ...c }));
    const custom = (cycles.customCoffres ?? []).map((c) => ({ ...c }));
    // dédoublonne par nom (custom en premier, seeded l'emporte en cas de collision) — voir liveCoffres(), qui ne fait qu'un .map() sans dédup.
    const map = new Map<string, Coffre>();
    custom.concat(seeded).forEach((c) => map.set(c.nom, c));
    return Array.from(map.values());
  }
  function archivedOpsRaw(): Operation[] {
    return M.seed ? seed.operations : M.archive ?? [];
  }
  function archivedOps(): (Operation & { _origIndex: number })[] {
    const raw = archivedOpsRaw();
    return raw
      .map((o, i) => {
        if (opDeletes.includes(i)) return null;
        const ov = opOverrides[String(i)];
        return ov ? { ...ov, _origIndex: i } : { ...o, _origIndex: i };
      })
      .filter((o): o is Operation & { _origIndex: number } => o != null);
  }
  function reverseOp(o: Operation): Operation {
    if (o.type === "virement") return { type: "virement", compte: o.compteDest ?? "", compteDest: o.compte, montant: Math.abs(o.montant), cat: "", date: o.date, lib: o.lib };
    if (o.type === "dépense") return { type: "revenu", compte: o.compte, montant: Math.abs(o.montant), cat: o.cat, date: o.date, lib: o.lib };
    if (o.type === "revenu") return { type: "dépense", compte: o.compte, montant: -Math.abs(o.montant), cat: o.cat, date: o.date, lib: o.lib };
    return { type: o.type, compte: o.compte, montant: 0, cat: o.cat, date: o.date, lib: o.lib };
  }
  function archAdjOps(): Operation[] {
    const out: Operation[] = [];
    const arch = archivedOpsRaw();
    opDeletes.forEach((i) => {
      const o = arch[i];
      if (o) out.push(reverseOp(o));
    });
    Object.keys(opOverrides).forEach((k) => {
      const o = arch[Number(k)];
      if (o) {
        out.push(reverseOp(o));
        out.push(opOverrides[k]);
      }
    });
    return out;
  }
  function baseDepense(): number {
    return archivedOps().reduce((s, o) => (o.type === "dépense" ? s + Math.abs(o.montant) : s), 0);
  }
  function baseRevenus(): number {
    return archivedOps().reduce((s, o) => (o.type === "revenu" ? s + Math.abs(o.montant) : s), 0);
  }
  function baseCategories(): Record<string, number> {
    const m: Record<string, number> = {};
    archivedOps().forEach((o) => {
      if (o.type === "dépense") {
        const l = o.cat || "Divers";
        m[l] = (m[l] || 0) + Math.abs(o.montant);
      }
    });
    return m;
  }
  function liveComptes(): Compte[] {
    const map: Record<string, Compte> = {};
    baseComptes().forEach((c) => (map[c.nom] = { ...c }));
    newOps.concat(archAdjOps()).forEach((o) => {
      const a = Math.abs(o.montant);
      if (o.type === "dépense" || o.type === "achat_titre") {
        if (map[o.compte]) map[o.compte].solde -= a;
      } else if (o.type === "revenu" || o.type === "dividende" || o.type === "vente_titre") {
        if (map[o.compte]) map[o.compte].solde += a;
      } else if (o.type === "virement") {
        if (map[o.compte]) map[o.compte].solde -= a;
        if (o.compteDest && map[o.compteDest]) map[o.compteDest].solde += a;
      }
    });
    return Object.values(map);
  }
  function liveCoffres(): (Coffre & { epargne: number })[] {
    const comptes = liveComptes();
    return baseCoffres().map((c) => {
      const objectif = coffreOverrides[c.nom] > 0 ? coffreOverrides[c.nom] : c.objectif;
      const acct = comptes.find((a) => norm(a.nom) === norm(c.nom));
      return { ...c, objectif, epargne: acct ? acct.solde : c.epargne };
    });
  }
  function liveCategories(): { label: string; value: number }[] {
    const map = baseCategories();
    newOps
      .filter((o) => o.type === "dépense")
      .forEach((o) => {
        const l = o.cat || "Divers";
        map[l] = (map[l] || 0) + Math.abs(o.montant);
      });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  return {
    seed,
    cycles,
    M,
    bucket,
    newOps,
    opOverrides,
    opDeletes,
    coffreOverrides,
    globalPlacements,
    baseComptes,
    baseCoffres,
    archivedOpsRaw,
    archivedOps,
    archAdjOps,
    baseDepense,
    baseRevenus,
    baseCategories,
    liveComptes,
    liveCoffres,
    liveCategories,
  };
}

export type CycleContext = ReturnType<typeof resolveCycleContext>;

export type CyclesMutationResult = { ok: true; cycles: Cycles } | { ok: false; error: string };

const ACCOUNT_TYPES = ["disponible", "épargne", "bloqué"] as const;

/** Crée un compte (global, comme cycles.placements — voir baseComptes()). */
export function createAccount(
  seed: SeedData,
  state: Record<string, unknown>,
  input: { nom: string; type: string; solde: number },
): CyclesMutationResult {
  const nom = (input.nom || "").trim();
  if (!nom) return { ok: false, error: "Nom manquant." };
  if (!(ACCOUNT_TYPES as readonly string[]).includes(input.type)) return { ok: false, error: "Type invalide." };
  if (!Number.isFinite(input.solde)) return { ok: false, error: "Solde invalide." };

  const ctx = resolveCycleContext(seed, state);
  if (ctx.baseComptes().some((c) => norm(c.nom) === norm(nom))) return { ok: false, error: "Un compte porte déjà ce nom." };

  const customComptes = [...(ctx.cycles.customComptes ?? []), { nom, type: input.type, solde: round(input.solde) }];
  return { ok: true, cycles: { ...ctx.cycles, customComptes } };
}

/** Crée un coffre d'épargne : un compte (type épargne/bloqué) + son objectif — voir baseCoffres(). */
export function createCoffre(
  seed: SeedData,
  state: Record<string, unknown>,
  input: { nom: string; objectif: number; bloque: boolean },
): CyclesMutationResult {
  const nom = (input.nom || "").trim();
  if (!nom) return { ok: false, error: "Nom manquant." };
  if (!Number.isFinite(input.objectif) || input.objectif <= 0) return { ok: false, error: "Objectif invalide." };

  const ctx = resolveCycleContext(seed, state);
  if (ctx.baseComptes().some((c) => norm(c.nom) === norm(nom))) return { ok: false, error: "Un compte porte déjà ce nom." };
  if (ctx.baseCoffres().some((c) => norm(c.nom) === norm(nom))) return { ok: false, error: "Un coffre porte déjà ce nom." };

  const customComptes = [...(ctx.cycles.customComptes ?? []), { nom, type: input.bloque ? "bloqué" : "épargne", solde: 0 }];
  const customCoffres = [...(ctx.cycles.customCoffres ?? []), { nom, objectif: round(input.objectif), epargne: 0, bloque: input.bloque }];
  return { ok: true, cycles: { ...ctx.cycles, customComptes, customCoffres } };
}
