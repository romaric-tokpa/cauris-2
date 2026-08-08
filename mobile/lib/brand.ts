import type { ImageSourcePropType } from "react-native";
import { colors } from "./theme";

export type BrandIcon = "phone" | "bank" | "cash" | "safe" | "chart";
export type Brand = { color: string; icon: BrandIcon; logo?: ImageSourcePropType };

const LOGOS: Record<string, ImageSourcePropType> = {
  sgbci: require("../assets/logos/logo-sgbci.png"),
  djamo: require("../assets/logos/logo-djamo.png"),
  wave: require("../assets/logos/logo-wave.png"),
  om: require("../assets/logos/logo-om.png"),
};

/**
 * Port de brandFor() dans public/app.js:588-597 — mêmes règles de détection par nom de compte.
 * Les couleurs des marques externes reconnues (SGBCI, Djamo, Wave, Orange Money) restent en dur
 * (identité de marque, pas de la charte Cauris) ; tout le reste réutilise les tokens de theme.ts
 * au lieu de dupliquer leurs valeurs hexadécimales, pour ne jamais dériver si la charte évolue.
 */
export function brandFor(nom: string, type: string): Brand {
  const n = nom.toLowerCase();
  if (type === "placement") return { color: colors.violet, icon: "chart" };
  if (type !== "disponible") {
    if (/urgence/.test(n)) return { color: colors.orange, icon: "safe" };
    if (/scolar/.test(n)) return { color: colors.blue, icon: "safe" };
    return { color: colors.acier, icon: "safe" };
  }
  if (/banque|sgbci/.test(n)) return { color: "#1F3A5F", icon: "bank", logo: LOGOS.sgbci };
  if (/djamo/.test(n)) return { color: "#0A0A0A", icon: "phone", logo: LOGOS.djamo };
  if (/wave/.test(n)) return { color: "#1DC8F0", icon: "phone", logo: LOGOS.wave };
  if (/orange money|\bom\b/.test(n)) return { color: "#FF7900", icon: "phone", logo: LOGOS.om };
  if (/cash|esp/.test(n)) return { color: colors.green, icon: "cash" };
  // Compte "disponible" non reconnu : mieux vaut une icône bancaire générique qu'un
  // téléphone, qui suggérait à tort du mobile money même pour un compte bancaire classique.
  return { color: colors.acier, icon: "bank" };
}
