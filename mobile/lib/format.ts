import { convert, getCurrency } from "./currency";

/**
 * Formate un montant stocké en XOF (FCFA) dans la devise d'affichage
 * courante (lib/currency.ts). Regroupement par milliers avec espace ; pas
 * d'Intl pour éviter toute dépendance à l'ICU embarqué dans Hermes.
 */
export function fmt(n: number): string {
  const currency = getCurrency();
  const converted = convert(n, currency);
  const decimals = currency === "XOF" ? 0 : 2;
  const rounded = Math.round(converted * 10 ** decimals) / 10 ** decimals;
  const sign = rounded < 0 ? "−" : "";
  const [intPart, decPart] = Math.abs(rounded).toFixed(decimals).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return sign + grouped + (decPart ? "," + decPart : "");
}
