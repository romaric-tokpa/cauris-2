import type { Feather } from "@expo/vector-icons";
import { apiFetch } from "./api";
import { currencySymbol } from "./currency";
import { fmt } from "./format";

export type NotifKind = "budget" | "pret" | "fleetos" | "dette";
export type Notif = { id: string; title: string; sub: string; icon: keyof typeof Feather.glyphMap; kind: NotifKind; route: string };

/**
 * Notifications calculées à partir des données déjà exposées (budget, coffres,
 * prêt, FleetOS) — pas de backend dédié. Pas de couleur ici : `kind` sert à
 * choisir bg/c au rendu (voir NotificationsSheet), pour rester réactif au
 * thème clair/sombre — cette fonction n'a pas accès à useColors().
 */
export async function fetchNotifications(): Promise<Notif[]> {
  const [budgetRes, coffresRes, pretRes, fleetosRes] = await Promise.all([
    apiFetch("/api/budget"),
    apiFetch("/api/coffres"),
    apiFetch("/api/pret"),
    apiFetch("/api/fleetos"),
  ]);
  const [budget, coffres, pret, fleetos] = await Promise.all([budgetRes.json(), coffresRes.json(), pretRes.json(), fleetosRes.json()]);

  const out: Notif[] = [];
  (budget.rows || [])
    .filter((r: { status: string }) => r.status === "over")
    .forEach((r: { cat: string; spent: number; budget: number }) =>
      out.push({
        id: `bud-${r.cat}`,
        title: `Budget ${r.cat} dépassé`,
        sub: `+${fmt(r.spent - r.budget)} ${currencySymbol()} au-delà du plafond`,
        icon: "alert-triangle",
        kind: "budget",
        route: "/budget",
      }),
    );
  if (pret.summary?.next) {
    out.push({
      id: "pret",
      title: "Échéance prêt étudiant",
      sub: `${fmt(pret.summary.next.montant)} ${currencySymbol()} à payer avant le ${pret.summary.next.date}`,
      icon: "credit-card",
      kind: "pret",
      route: "/pret",
    });
  }
  if (fleetos.summary) {
    out.push({
      id: "fleetos",
      title: "FleetOS · versement à venir",
      sub: `${fmt(fleetos.summary.cur.epargne)} ${currencySymbol()} prévus ce mois pour rester dans le plan`,
      icon: "truck",
      kind: "fleetos",
      route: "/fleetos",
    });
  }
  (coffres.dettes || [])
    .filter((d: { paid: boolean }) => !d.paid)
    .forEach((d: { id: string; nom: string; montant: number; echeance?: string }) =>
      out.push({
        id: `dette-${d.id}`,
        title: `Dette · ${d.nom}`,
        sub: `${fmt(d.montant)} ${currencySymbol()} à rembourser${d.echeance ? ` · échéance ${d.echeance}` : ""}`,
        icon: "alert-circle",
        kind: "dette",
        route: "/coffres",
      }),
    );
  return out;
}
