const fs = require("fs");
let s = fs.readFileSync("_design/MaCaisse/data.js", "utf8");
const start = s.indexOf("window.MACAISSE");
s = s.slice(start).replace(/^window\.MACAISSE\s*=\s*/, "").replace(/;\s*$/, "").trim();
const obj = eval("(" + s + ")");
console.log("ops:", obj.operations.length, "comptes:", obj.comptes.length, "coffres:", obj.coffres.length);

const header =
`// Cauris — données seed (Juin 2026), portées depuis le design (data.js).
// Réconciliées à partir de Cauris_Suivi_juin_2026.xlsx (225 opérations).
// Ce cycle d'origine est inséré dans Turso au premier démarrage, puis sert
// de "window.MACAISSE" côté client (renvoyé par /api/bootstrap).

export type Operation = {
  date: string;
  lib: string;
  type: "dépense" | "revenu" | "virement";
  compte: string;
  cat: string;
  montant: number;
  note?: string;
};

export type SeedData = {
  asOf: string;
  kpis: Record<string, number>;
  patrimoineSplit: { label: string; value: number }[];
  comptes: { nom: string; solde: number; type: string; note: string }[];
  categories: { label: string; value: number }[];
  revCategories: { label: string; value: number }[];
  coffres: { nom: string; objectif: number; epargne: number; bloque: boolean; note: string }[];
  dettes: unknown[];
  dettesNote: string;
  ventilation: unknown;
  operations: Operation[];
};

export const SEED: SeedData = `;

const out = header + JSON.stringify(obj, null, 2) + ";\n";
fs.writeFileSync("src/lib/seed.ts", out);
console.log("wrote src/lib/seed.ts", fs.statSync("src/lib/seed.ts").size, "bytes");
