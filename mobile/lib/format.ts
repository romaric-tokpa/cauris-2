/** Regroupement par milliers avec espace insécable, comme fmt() côté web. Pas d'Intl : évite toute dépendance à l'ICU embarqué dans Hermes. */
export function fmt(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "−" : "";
  const digits = Math.abs(rounded).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return sign + grouped;
}
