import "server-only";
import type { SeedData } from "./seed";
import { bucketKey, resolveCycleContext, round, type Bucket, type UserDette } from "./cycle";

/** Coffres & dettes — voir renderCoffres() dans public/app.js pour l'équivalent client. */

type SeedDette = { nom: string; montant: number; retrait?: string; echeance?: string };

export type CoffreItem = {
  nom: string;
  epargne: number;
  objectif: number;
  bloque: boolean;
  pct: number;
  rank: string;
  status: "done" | "warn" | "normal";
  note?: string;
};

export type DetteItem = {
  id: string;
  nom: string;
  montant: number;
  retrait?: string;
  echeance?: string;
  paid: boolean;
  source: "seed" | "manuel" | "auto";
};

export type CoffresResponse = {
  overview: { total: number; accessible: number; bloquee: number };
  coffres: CoffreItem[];
  detteReste: number;
  dettes: DetteItem[];
  dettesNote?: string;
};

export function computeCoffres(seed: SeedData, state: Record<string, unknown>): CoffresResponse {
  const ctx = resolveCycleContext(seed, state);
  const cofs = ctx.liveCoffres();

  const total = cofs.reduce((s, c) => s + c.epargne, 0);
  const accessible = cofs.filter((c) => !c.bloque).reduce((s, c) => s + c.epargne, 0);
  const bloquee = cofs.filter((c) => c.bloque).reduce((s, c) => s + c.epargne, 0);

  let prio = 0;
  const coffres: CoffreItem[] = cofs.map((c) => {
    const pct = c.objectif ? Math.min(100, (c.epargne / c.objectif) * 100) : 0;
    const warn = /⚠/.test(c.note || "");
    const done = c.objectif > 0 && c.epargne >= c.objectif;
    const rank = c.bloque ? "Épargne bloquée" : `Priorité ${++prio}`;
    return {
      nom: c.nom,
      epargne: round(c.epargne),
      objectif: round(c.objectif),
      bloque: c.bloque,
      pct: Math.round(pct * 10) / 10,
      rank,
      status: done ? "done" : warn ? "warn" : "normal",
      note: (c.note || "").replace(/⚠\s*/, "") || undefined,
    };
  });

  const dettePaid = ctx.bucket.dettePaid ?? {};
  const userDettes = ctx.bucket.userDettes ?? [];
  const seedDettes = ctx.M.seed ? ((seed.dettes as SeedDette[]) ?? []) : [];

  const seedItems: DetteItem[] = seedDettes.map((d, i) => ({
    id: `seed-${i}`,
    nom: d.nom,
    montant: round(d.montant),
    retrait: d.retrait,
    echeance: d.echeance,
    paid: !!dettePaid[String(i)],
    source: "seed",
  }));
  const userItems: DetteItem[] = userDettes.map((d) => ({
    id: d.id,
    nom: d.nom,
    montant: round(d.montant),
    retrait: d.retrait,
    echeance: d.echeance,
    paid: !!d.paid,
    source: d.manual ? "manuel" : "auto",
  }));

  const allDettes = [...seedItems, ...userItems];
  const detteReste = allDettes.filter((d) => !d.paid).reduce((s, d) => s + d.montant, 0);

  return {
    overview: { total: round(total), accessible: round(accessible), bloquee: round(bloquee) },
    coffres,
    detteReste: round(detteReste),
    dettes: allDettes,
    dettesNote: ctx.M.seed ? seed.dettesNote : undefined,
  };
}

export type DetteMutationResult = { ok: true; cycleId: string; updatedBucket: Record<string, unknown> } | { ok: false; error: string };

/** Marque (ou démarque) une dette payée — id `seed-<index>` (dette du seed) ou l'id d'une dette utilisateur. */
export function setDettePaid(seed: SeedData, state: Record<string, unknown>, id: string, paid: boolean): DetteMutationResult {
  const ctx = resolveCycleContext(seed, state);
  const { M } = ctx;
  const rawBucket = (state[bucketKey(M.id)] as Record<string, unknown>) ?? {};

  const seedMatch = /^seed-(\d+)$/.exec(id);
  if (seedMatch) {
    const seedDettes = ctx.M.seed ? (seed.dettes as { nom: string }[] | undefined) ?? [] : [];
    if (!seedDettes[Number(seedMatch[1])]) return { ok: false, error: "Dette introuvable." };
    const dettePaid: Bucket["dettePaid"] = { ...((rawBucket.dettePaid as Record<string, boolean>) ?? {}), [seedMatch[1]]: paid };
    return { ok: true, cycleId: M.id, updatedBucket: { ...rawBucket, dettePaid } };
  }

  const userDettes = Array.isArray(rawBucket.userDettes) ? (rawBucket.userDettes as UserDette[]) : [];
  const idx = userDettes.findIndex((d) => d.id === id);
  if (idx < 0) return { ok: false, error: "Dette introuvable." };
  const updated = [...userDettes];
  updated[idx] = { ...updated[idx], paid };
  return { ok: true, cycleId: M.id, updatedBucket: { ...rawBucket, userDettes: updated } };
}
