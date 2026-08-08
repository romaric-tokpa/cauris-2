import "server-only";
import type { SeedData } from "./seed";
import { resolveCycleContext, bucketKey, round, type Operation, type OpType, type UserDette } from "./cycle";

/**
 * Journal des opérations (lecture) et ajout d'une opération (écriture) — voir
 * allOps()/saveForm() dans public/app.js pour l'équivalent client. Ne couvre
 * pas encore l'édition/suppression d'opérations existantes, l'assistant
 * « opération croisée », ni le lien dette↔coffre.
 */

function parseDate(d: string | undefined): number {
  const m = (d || "").match(/(\d+)\/(\d+)/);
  return m ? Number(m[2]) * 100 + Number(m[1]) : 0;
}

export type OperationEntry = {
  id: string;
  isNew: boolean;
  date?: string;
  lib?: string;
  type: OpType;
  compte: string;
  compteDest?: string;
  cat?: string;
  montant: number;
  note?: string;
};

export type OperationsFeedResponse = {
  cycleLabel: string;
  activeMonthMm: string;
  accounts: { nom: string; type: string }[];
  operations: OperationEntry[];
};

export function computeOperationsFeed(seed: SeedData, state: Record<string, unknown>): OperationsFeedResponse {
  const ctx = resolveCycleContext(seed, state);
  const { M, newOps } = ctx;

  const arch = ctx.archivedOps().map((o) => ({ ...o, _new: false, _i: o._origIndex, _seq: o._origIndex }));
  const nw = newOps.map((o, i) => ({ ...o, _new: true, _i: i, _seq: o._ts ?? 1e12 + i }));
  const merged = [...arch, ...nw].sort((a, b) => parseDate(b.date) - parseDate(a.date) || b._seq - a._seq);

  const operations: OperationEntry[] = merged.map((o) => ({
    id: `${o._new ? "n" : "a"}-${o._i}`,
    isNew: o._new,
    date: o.date,
    lib: o.lib,
    type: o.type,
    compte: o.compte,
    compteDest: o.compteDest,
    cat: o.cat,
    montant: round(o.montant),
    note: o.note,
  }));

  const accounts = ctx
    .baseComptes()
    .filter((c) => c.type !== "placement")
    .map((c) => ({ nom: c.nom, type: c.type }));

  return { cycleLabel: M.label, activeMonthMm: M.mm, accounts, operations };
}

export type AppendOperationInput = {
  type: OpType;
  montant: number;
  date: string;
  lib: string;
  compte: string;
  compteDest?: string;
  cat?: string;
  note?: string;
  frais?: number;
  asDette?: boolean;
  detteEcheance?: string;
};

export type AppendOperationResult = { ok: true; cycleId: string; updatedBucket: Record<string, unknown> } | { ok: false; error: string };

export function appendOperation(seed: SeedData, state: Record<string, unknown>, input: AppendOperationInput): AppendOperationResult {
  const ctx = resolveCycleContext(seed, state);
  const { M } = ctx;

  const lib = (input.lib || "").trim();
  const date = (input.date || "").trim();
  const compte = input.compte || "";
  const compteDest = input.compteDest || "";
  const type = input.type;

  if (!lib) return { ok: false, error: "Libellé manquant." };
  if (!date) return { ok: false, error: "Date manquante." };
  if (!input.montant) return { ok: false, error: "Montant manquant." };
  if (!compte) return { ok: false, error: "Compte manquant." };
  if (type === "virement" && !compteDest) return { ok: false, error: "Un virement exige un compte de destination." };
  if (type === "virement" && compteDest === compte) return { ok: false, error: "Source et destination doivent différer." };

  const validNames = ctx.baseComptes().map((c) => c.nom);
  if (!validNames.includes(compte)) return { ok: false, error: "Compte source inconnu." };
  if (type === "virement" && !validNames.includes(compteDest)) return { ok: false, error: "Compte de destination inconnu." };

  const montant = Math.abs(input.montant) * (type === "dépense" ? -1 : 1);
  const frais = Math.abs(input.frais || 0);
  const now = Date.now();
  const hhmm = new Date(now).toTimeString().slice(0, 5);

  const op: Operation = {
    date,
    lib,
    type,
    compte,
    compteDest: type === "virement" ? compteDest : undefined,
    cat: type === "virement" ? "" : input.cat,
    montant,
    note: input.note,
  };
  const newEntries: Operation[] = [];
  if (frais > 0) {
    const gid = `x${now}`;
    op._xlink = gid;
    op._ts = now;
    op._t = hhmm;
    newEntries.push(op);
    newEntries.push({
      date,
      lib: `Frais — ${lib}`,
      type: "dépense",
      compte,
      cat: "Frais",
      montant: -frais,
      note: `Frais de ${type === "virement" ? "virement" : "transaction"}`,
      _xlink: gid,
      _ts: now - 1,
      _t: hhmm,
    });
  } else {
    op._ts = now;
    op._t = hhmm;
    newEntries.push(op);
  }

  const rawBucket = (state[bucketKey(M.id)] as Record<string, unknown>) ?? {};
  const existingNewOps = Array.isArray(rawBucket.newOps) ? (rawBucket.newOps as Operation[]) : [];
  const updatedBucket: Record<string, unknown> = { ...rawBucket, newOps: [...existingNewOps, ...newEntries] };

  // Dette à rembourser à un coffre, liée à l'opération via _xlink — voir
  // applyDetteLink() dans public/app.js. Réutilise le lien de frais s'il y en
  // a déjà un sur l'opération, sinon en crée un nouveau.
  if (input.asDette && (type === "dépense" || type === "virement")) {
    const link = op._xlink ?? `ud${now}`;
    op._xlink = link;
    const existingUserDettes = Array.isArray(rawBucket.userDettes) ? (rawBucket.userDettes as UserDette[]) : [];
    const dette: UserDette = {
      id: `ud${now}`,
      nom: lib,
      montant: Math.abs(montant),
      retrait: date,
      echeance: (input.detteEcheance || "").trim() || "à définir",
      paid: false,
      manual: true,
    };
    updatedBucket.userDettes = [...existingUserDettes, dette];
  }

  return { ok: true, cycleId: M.id, updatedBucket };
}

/**
 * Édition/suppression d'une opération existante du cycle actif — id au format
 * `n-<index dans newOps>` (ajoutée ce cycle) ou `a-<index d'origine>` (archivée,
 * seed ou mois clôturé). Une opération archivée ne peut pas être mutée en place :
 * on écrit un override (`bucket.opOverrides`) ou une suppression (`bucket.opDeletes`),
 * déjà lus par resolveCycleContext()/resolvedOpsForMonth() — voir cycle.ts.
 */
export type MutateOperationInput = {
  type: OpType;
  montant: number;
  date: string;
  lib: string;
  compte: string;
  compteDest?: string;
  cat?: string;
  note?: string;
};

function validateMutation(ctx: ReturnType<typeof resolveCycleContext>, input: MutateOperationInput): string | null {
  const lib = (input.lib || "").trim();
  if (!lib) return "Libellé manquant.";
  if (!(input.date || "").trim()) return "Date manquante.";
  if (!input.montant) return "Montant manquant.";
  if (!input.compte) return "Compte manquant.";
  if (input.type === "virement" && !input.compteDest) return "Un virement exige un compte de destination.";
  if (input.type === "virement" && input.compteDest === input.compte) return "Source et destination doivent différer.";
  const validNames = ctx.baseComptes().map((c) => c.nom);
  if (!validNames.includes(input.compte)) return "Compte source inconnu.";
  if (input.type === "virement" && input.compteDest && !validNames.includes(input.compteDest)) return "Compte de destination inconnu.";
  return null;
}

function parseOpId(id: string): { kind: "n" | "a"; idx: number } | null {
  const m = /^([na])-(\d+)$/.exec(id || "");
  if (!m) return null;
  return { kind: m[1] as "n" | "a", idx: Number(m[2]) };
}

export function editOperation(
  seed: SeedData,
  state: Record<string, unknown>,
  id: string,
  input: MutateOperationInput,
): AppendOperationResult {
  const ctx = resolveCycleContext(seed, state);
  const { M } = ctx;
  const parsed = parseOpId(id);
  if (!parsed) return { ok: false, error: "Identifiant invalide." };

  const err = validateMutation(ctx, input);
  if (err) return { ok: false, error: err };

  const montant = Math.abs(input.montant) * (input.type === "dépense" ? -1 : 1);
  const patch: Partial<Operation> = {
    date: input.date.trim(),
    lib: input.lib.trim(),
    type: input.type,
    compte: input.compte,
    compteDest: input.type === "virement" ? input.compteDest : undefined,
    cat: input.type === "virement" ? "" : input.cat,
    montant,
    note: input.note,
  };

  const rawBucket = (state[bucketKey(M.id)] as Record<string, unknown>) ?? {};

  if (parsed.kind === "n") {
    const newOps = Array.isArray(rawBucket.newOps) ? [...(rawBucket.newOps as Operation[])] : [];
    if (!newOps[parsed.idx]) return { ok: false, error: "Opération introuvable." };
    newOps[parsed.idx] = { ...newOps[parsed.idx], ...patch };
    return { ok: true, cycleId: M.id, updatedBucket: { ...rawBucket, newOps } };
  }

  const original = ctx.archivedOpsRaw()[parsed.idx];
  if (!original) return { ok: false, error: "Opération introuvable." };
  const opOverrides = { ...((rawBucket.opOverrides as Record<string, Operation>) ?? {}) };
  opOverrides[String(parsed.idx)] = { ...original, ...patch };
  return { ok: true, cycleId: M.id, updatedBucket: { ...rawBucket, opOverrides } };
}

export function deleteOperation(seed: SeedData, state: Record<string, unknown>, id: string): AppendOperationResult {
  const ctx = resolveCycleContext(seed, state);
  const { M } = ctx;
  const parsed = parseOpId(id);
  if (!parsed) return { ok: false, error: "Identifiant invalide." };

  const rawBucket = (state[bucketKey(M.id)] as Record<string, unknown>) ?? {};

  if (parsed.kind === "n") {
    const newOps = Array.isArray(rawBucket.newOps) ? [...(rawBucket.newOps as Operation[])] : [];
    const target = newOps[parsed.idx];
    if (!target) return { ok: false, error: "Opération introuvable." };
    const xlink = target._xlink;
    const filtered = xlink ? newOps.filter((o) => o._xlink !== xlink) : newOps.filter((_, i) => i !== parsed.idx);
    return { ok: true, cycleId: M.id, updatedBucket: { ...rawBucket, newOps: filtered } };
  }

  const rawOps = ctx.archivedOpsRaw();
  const target = rawOps[parsed.idx];
  if (!target) return { ok: false, error: "Opération introuvable." };
  const xlink = target._xlink;
  const toDelete = xlink ? rawOps.reduce<number[]>((acc, o, i) => (o._xlink === xlink ? [...acc, i] : acc), []) : [parsed.idx];
  const existing = Array.isArray(rawBucket.opDeletes) ? (rawBucket.opDeletes as number[]) : [];
  const opDeletes = Array.from(new Set([...existing, ...toDelete]));
  return { ok: true, cycleId: M.id, updatedBucket: { ...rawBucket, opDeletes } };
}
