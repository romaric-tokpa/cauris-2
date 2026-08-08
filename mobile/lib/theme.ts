/** Charte Cauris — mêmes tokens que public/macaisse.css (custom properties CSS). */
export const lightColors = {
  anthracite: "#1C2025",
  orange: "#E2541A",
  acier: "#6C737B",
  beton: "#F5F3EF",
  hivis: "#F2C200",
  green: "#1F8A5B",
  // Distinct de `orange` : les deux étaient auparavant à la même teinte (~15°, brique/orangé),
  // ce qui rendait dépense (rouge) et actions principales (orange) difficiles à distinguer d'un
  // coup d'œil sur les puces/icônes. Décalé vers une teinte plus rouge (~5°) tout en restant dans
  // la même famille sourde/terreuse que le reste de la charte.
  red: "#C23B2E",
  blue: "#2A6FDB",
  violet: "#7A4FD0",
  ink: "#1C2025",
  muted: "#6C737B",
  paper: "#FFFFFF",
  desk: "#E5E1D9",
  line: "rgba(28,32,37,0.12)",
  line2: "rgba(28,32,37,0.22)",
  fill: "#FBFAF7",
  // Tokens ajoutés pour le redesign Android ("Cauris Android.dc.html") : mêmes
  // couleurs de marque, avec quelques nuances supplémentaires (hairlines plus
  // douces, gris secondaire, fond d'écran mobile) que l'ancienne charte n'avait
  // pas encore.
  muted2: "#9AA0A6",
  lineSoft: "rgba(28,32,37,0.06)",
  fillSoft: "#F1EFEA",
  screenBg: "#F6F5F1",
  // Fond doux pour l'orange, au même titre que amberBg/greenBg/redBg/blueBg/violetBg —
  // seul l'orange (couleur de marque la plus utilisée) n'avait pas son propre fond avant,
  // ce qui forçait à détourner redBg comme approximation par endroits (FleetOS, notifications).
  orangeBg: "#FBE0D4",
  amber: "#C99A00",
  amberBg: "#FBEFD6",
  greenBg: "#E1F1E9",
  redBg: "#FBE7DF",
  blueBg: "#E4EDFB",
  violetBg: "#EFE7FA",
  segmentOff: "#E7E4DE",
  // Variantes vives indépendantes du thème, pour du texte/chiffres sur une surface qui reste
  // sombre quel que soit le thème actif (cartes hero anthracite, dégradé de login/biométrie) —
  // `green`/`red`/`muted` sont réglés pour du texte sur `paper`, pas assez vifs sur `anthracite`.
  // Avant ce token, chaque écran redéfinissait ces couleurs en dur (`#4ED88F`, `#FF9E7A`...).
  onDarkGreen: "#4ED88F",
  onDarkRed: "#FF9E7A",
  onDarkMuted: "#B8BEC6",
};

/**
 * Équivalents sombres — les couleurs de marque/statut (orange, vert, rouge,
 * bleu, violet, hivis) restent identiques dans les deux thèmes (cohérence de
 * marque) ; seules les surfaces, le texte et les bordures s'inversent.
 */
export const darkColors: typeof lightColors = {
  anthracite: "#15171A",
  orange: "#E2541A",
  acier: "#9199A3",
  beton: "#1C1F23",
  hivis: "#F2C200",
  green: "#1F8A5B",
  red: "#C23B2E",
  blue: "#2A6FDB",
  violet: "#7A4FD0",
  ink: "#F2F1EE",
  muted: "#9199A3",
  paper: "#1C1F23",
  desk: "#101214",
  line: "rgba(255,255,255,0.12)",
  line2: "rgba(255,255,255,0.2)",
  fill: "#22262B",
  muted2: "#8B929A",
  lineSoft: "rgba(255,255,255,0.08)",
  fillSoft: "#20242A",
  screenBg: "#121417",
  orangeBg: "rgba(226,84,26,0.22)",
  amber: "#D9AC1A",
  amberBg: "rgba(201,154,0,0.18)",
  greenBg: "rgba(31,138,91,0.18)",
  redBg: "rgba(200,67,27,0.2)",
  blueBg: "rgba(42,111,219,0.18)",
  violetBg: "rgba(122,79,208,0.18)",
  segmentOff: "#2A2E34",
  onDarkGreen: "#4ED88F",
  onDarkRed: "#FF9E7A",
  onDarkMuted: "#B8BEC6",
};

export type ThemeColors = typeof lightColors;

/** Alias historique : thème clair statique, pour les écrans pas encore convertis à useColors(). */
export const colors = lightColors;

/** Couleurs cycliques pour distinguer les coffres visuellement (carrousel Accueil), comme dans la maquette. */
export function coffreColorsFor(c: ThemeColors): string[] {
  return [c.orange, c.green, c.blue, c.violet];
}
export const coffreColors = coffreColorsFor(lightColors);

export const fonts = {
  sans: "Archivo_400Regular",
  sansMedium: "Archivo_500Medium",
  sansSemiBold: "Archivo_600SemiBold",
  sansBold: "Archivo_700Bold",
  mono: "SpaceMono_400Regular",
  monoBold: "SpaceMono_700Bold",
};

export function accountAccentFor(c: ThemeColors): Record<string, string> {
  return { disponible: c.orange, épargne: c.blue, bloqué: c.acier, placement: c.violet };
}
export const accountAccent: Record<string, string> = accountAccentFor(lightColors);
