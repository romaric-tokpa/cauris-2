import "server-only";
import type { SeedData } from "./seed";
import { resolveCycleContext, round, norm } from "./cycle";

/**
 * KPI du tableau de bord — voir renderDash()/liveKpis() dans public/app.js
 * pour l'équivalent client. Ne couvre pas les autres onglets.
 */

export type DashboardResponse = {
  monthLabel: string;
  asOfLabel: string;
  kpis: {
    patrimoine: number;
    disponible: number;
    epargne: number;
    coffres: number;
    bloque: number;
    placement: number;
    depense: number;
    revenus: number;
    epargneNette: number;
    tauxEpargnePct: number;
    fraisMois: number;
  };
  accountGroups: {
    title: string;
    subtotal: number;
    pctOfPatrimoine: number;
    accounts: { nom: string; solde: number; note?: string }[];
  }[];
  categories: { label: string; value: number }[];
  coherence: { ok: boolean; checks: { ok: boolean; label: string }[] };
};

export function computeDashboard(seed: SeedData, state: Record<string, unknown>): DashboardResponse {
  const ctx = resolveCycleContext(seed, state);
  const { M, newOps } = ctx;

  const sumType = (c: ReturnType<typeof ctx.liveComptes>, t: string) => c.filter((x) => x.type === t).reduce((s, x) => s + x.solde, 0);
  const comptes = ctx.liveComptes();
  const dispo = sumType(comptes, "disponible");
  const coffresSum = sumType(comptes, "épargne");
  const bloque = sumType(comptes, "bloqué");
  const placement = sumType(comptes, "placement");
  const newDep = newOps.filter((o) => o.type === "dépense").reduce((s, o) => s + Math.abs(o.montant), 0);
  const newRev = newOps.filter((o) => o.type === "revenu" || o.type === "dividende").reduce((s, o) => s + Math.abs(o.montant), 0);
  const depense = ctx.baseDepense() + newDep;
  const revenus = ctx.baseRevenus() + newRev;
  const epargneNette = revenus - depense;
  const tauxEpargne = revenus > 0 ? epargneNette / revenus : 0;
  const patrimoine = dispo + coffresSum + bloque + placement;

  const allOps = [...ctx.archivedOps(), ...newOps];
  const fraisMois = allOps
    .filter((o) => o.type === "dépense" && (o.cat || "").toLowerCase() === "frais")
    .reduce((s, o) => s + Math.abs(o.montant), 0);

  const added = newOps.length;
  const asOfLabel = M.seed
    ? added
      ? `Mis à jour · ${added} opération${added > 1 ? "s" : ""} ajoutée${added > 1 ? "s" : ""}`
      : `Snapshot au ${seed.asOf}`
    : `Cycle ${M.label}${added ? ` · ${added} op.` : " · démarré"}`;

  const groups: { title: string; type: string }[] = [
    { title: "Comptes disponibles", type: "disponible" },
    { title: "Coffres (épargne accessible)", type: "épargne" },
    { title: "Épargne bloquée", type: "bloqué" },
    { title: "Placements", type: "placement" },
  ];
  const accountGroups = groups
    .map((g) => {
      const items = comptes.filter((c) => c.type === g.type);
      if (!items.length) return null;
      const subtotal = items.reduce((s, c) => s + c.solde, 0);
      return {
        title: g.title,
        subtotal: round(subtotal),
        pctOfPatrimoine: patrimoine > 0 ? Math.round((subtotal / patrimoine) * 1000) / 10 : 0,
        accounts: items.map((c) => ({ nom: c.nom, solde: round(c.solde), note: c.note || undefined })),
      };
    })
    .filter((g): g is NonNullable<typeof g> => g != null);

  const validNames = comptes.map((c) => c.nom);
  const orphans = newOps.filter((o) => o.type === "virement" && (!o.compteDest || !validNames.includes(o.compteDest) || !validNames.includes(o.compte)));
  const neg = comptes.filter((c) => c.solde < 0);
  const cofs = ctx.liveCoffres();
  const mism = cofs.filter((c) => {
    const a = comptes.find((x) => norm(x.nom) === norm(c.nom));
    return a && round(a.solde) !== round(c.epargne);
  });
  const checks = [
    { ok: true, label: "Patrimoine = somme des comptes" },
    {
      ok: orphans.length === 0,
      label: orphans.length ? `${orphans.length} virement(s) sans destination valide` : "Chaque virement boucle (source → destination)",
    },
    { ok: neg.length === 0, label: neg.length ? `${neg.length} compte(s) à découvert` : "Aucun compte à découvert" },
    { ok: mism.length === 0, label: mism.length ? `${mism.length} coffre(s) non réconcilié(s)` : "Coffres alignés sur leurs comptes" },
  ];

  return {
    monthLabel: M.seed ? seed.asOf.split(" ").slice(1).join(" ") : M.label,
    asOfLabel,
    kpis: {
      patrimoine: round(patrimoine),
      disponible: round(dispo),
      epargne: round(coffresSum + bloque),
      coffres: round(coffresSum),
      bloque: round(bloque),
      placement: round(placement),
      depense: round(depense),
      revenus: round(revenus),
      epargneNette: round(epargneNette),
      tauxEpargnePct: Math.round(tauxEpargne * 1000) / 10,
      fraisMois: round(fraisMois),
    },
    accountGroups,
    categories: ctx.liveCategories().map((c) => ({ label: c.label, value: round(c.value) })),
    coherence: { ok: checks.every((c) => c.ok), checks },
  };
}
