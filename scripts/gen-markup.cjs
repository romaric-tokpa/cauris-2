const fs = require("fs");
let html = fs.readFileSync("_design/MaCaisse/MaCaisse - Suivi de trésorerie.html", "utf8");

// Corps entre <body> et </body>
const body = html.slice(html.indexOf("<body>") + "<body>".length, html.indexOf("</body>"));

// Retirer les <script src="data.js"> et <script src="app.js"> : c'est sync.js
// (chargé par la page Next) qui hydrate window.MACAISSE puis injecte app.js.
const cleaned = body
  .replace(/<script src="data\.js"><\/script>/g, "")
  .replace(/<script src="app\.js"><\/script>/g, "")
  .trim();

const out =
  "// Généré depuis le design (MaCaisse - Suivi de trésorerie.html).\n" +
  "// Corps de l'application, injecté tel quel dans la page authentifiée.\n" +
  "// Ne pas éditer à la main : régénérer via scripts/gen-markup.cjs.\n\n" +
  "export const APP_MARKUP = " +
  JSON.stringify(cleaned) +
  ";\n";

fs.writeFileSync("src/app/appMarkup.ts", out);
console.log("wrote src/app/appMarkup.ts", fs.statSync("src/app/appMarkup.ts").size, "bytes");
