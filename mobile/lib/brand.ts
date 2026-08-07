import type { ImageSourcePropType } from "react-native";

export type BrandIcon = "phone" | "bank" | "cash" | "safe" | "chart";
export type Brand = { color: string; icon: BrandIcon; logo?: ImageSourcePropType };

const LOGOS: Record<string, ImageSourcePropType> = {
  sgbci: require("../assets/logos/logo-sgbci.png"),
  djamo: require("../assets/logos/logo-djamo.png"),
  wave: require("../assets/logos/logo-wave.png"),
  om: require("../assets/logos/logo-om.png"),
};

/** Port de brandFor() dans public/app.js:588-597 — mêmes règles de détection par nom de compte. */
export function brandFor(nom: string, type: string): Brand {
  const n = nom.toLowerCase();
  if (type === "placement") return { color: "#7A4FD0", icon: "chart" };
  if (type !== "disponible") {
    if (/urgence/.test(n)) return { color: "#E2541A", icon: "safe" };
    if (/scolar/.test(n)) return { color: "#2A6FDB", icon: "safe" };
    return { color: "#6C737B", icon: "safe" };
  }
  if (/banque|sgbci/.test(n)) return { color: "#1F3A5F", icon: "bank", logo: LOGOS.sgbci };
  if (/djamo/.test(n)) return { color: "#0A0A0A", icon: "phone", logo: LOGOS.djamo };
  if (/wave/.test(n)) return { color: "#1DC8F0", icon: "phone", logo: LOGOS.wave };
  if (/orange money|\bom\b/.test(n)) return { color: "#FF7900", icon: "phone", logo: LOGOS.om };
  if (/cash|esp/.test(n)) return { color: "#1F8A5B", icon: "cash" };
  return { color: "#6C737B", icon: "phone" };
}
