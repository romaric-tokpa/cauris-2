# Cauris — Suivi de trésorerie (MaCaisse)

Application fullstack de suivi de trésorerie personnelle (FCFA) de Romaric Tokpa.
Le design d'origine (100 % conservé) est piloté par une couche de synchronisation
qui remplace `localStorage` par une **base de données Turso (libSQL)** : vos données
sont durables, sauvegardées et accessibles depuis n'importe quel appareil.

## Fonctionnalités

- **Tableau de bord** — patrimoine, disponible, épargne, dépenses/revenus du mois,
  taux d'épargne, contrôle de cohérence des comptes, jauge du fonds d'urgence,
  tendance des dépenses, répartition par catégorie et par source.
- **Suivi mensuel** — tableau mois par mois (revenus / dépenses / épargne / taux).
- **Opérations** — journal complet : recherche, filtres, ajout / modification /
  suppression, assistant « opération croisée » (monnaie rendue, envoi / don, frais).
- **Coffres & dettes** — coffres d'épargne avec objectifs, dettes à rembourser.
- **Ventilation** — répartition des revenus (charges / coffres / coussins).
- **Cycles multi-mois** — clôture d'un mois, report des soldes, historique.

## Stack

| Couche        | Choix                                                     |
| ------------- | --------------------------------------------------------- |
| Framework     | Next.js 15 (App Router) — déployable sur Vercel           |
| Base          | **Turso / libSQL** via `@libsql/client`                   |
| Auth          | Mot de passe unique + cookie de session signé (HMAC)      |
| Front         | Design d'origine (HTML/CSS/JS) servi tel quel + `sync.js` |

### Architecture de synchronisation

1. La page (authentifiée) sert le markup du design + `sync.js`.
2. `sync.js` appelle `GET /api/bootstrap` → `{ seed, state }` depuis Turso.
3. Il place `window.MACAISSE = seed`, réhydrate le stockage local, puis charge
   `app.js` (le code d'origine, **inchangé**).
4. Chaque écriture (`localStorage.setItem`) est répliquée vers Turso via
   `POST /api/state` (débounce 180 ms). Les suppressions passent par `DELETE`.

Ainsi toute la logique métier (~1000 lignes de `app.js`) reste intacte ; seule la
persistance a changé.

## Démarrage local

```bash
npm install
cp .env.example .env.local     # puis éditez APP_PASSWORD (SESSION_SECRET est déjà généré)
npm run dev                    # http://localhost:3000
```

Sans `TURSO_DATABASE_URL`, l'app utilise une base fichier locale
`./data/cauris.db` — aucun compte Turso n'est requis pour développer.
Le mot de passe par défaut en local est celui de votre `.env.local` (`cauris`).

## Héberger les données sur Turso

1. Installez la CLI et connectez-vous :

   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login
   ```

2. Créez la base et récupérez les identifiants :

   ```bash
   turso db create cauris
   turso db show cauris --url          # -> TURSO_DATABASE_URL (libsql://…)
   turso db tokens create cauris       # -> TURSO_AUTH_TOKEN
   ```

3. Renseignez-les dans `.env.local` (ou dans les variables d'environnement Vercel) :

   ```
   TURSO_DATABASE_URL=libsql://cauris-xxxx.turso.io
   TURSO_AUTH_TOKEN=eyJ…
   APP_PASSWORD=un-mot-de-passe-fort
   SESSION_SECRET=<openssl rand -hex 32>
   ```

Le schéma (`state`, `meta`) et le cycle d'origine (Juin 2026) sont créés
automatiquement au premier accès.

## Déploiement Vercel

```bash
npm i -g vercel
vercel                # lie le projet
# Ajoutez les 4 variables d'environnement dans le dashboard Vercel (ou via CLI) :
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add APP_PASSWORD
vercel env add SESSION_SECRET
vercel --prod
```

## Structure

```
src/
  app/
    layout.tsx            racine (polices, <html>)
    page.tsx              app authentifiée (injecte le markup + sync.js)
    globals.css           styles de connexion + voile de chargement
    appMarkup.ts          corps du design (généré)
    login/                page + action de connexion
    api/
      bootstrap/route.ts  GET  seed + état utilisateur
      state/route.ts      POST/DELETE une entrée d'état
      logout/route.ts     POST déconnexion
  lib/
    db.ts                 client Turso/libSQL + schéma + seed
    seed.ts               données Juin 2026 (généré depuis data.js)
    auth.ts               session HMAC, mot de passe
public/
  app.js                  logique d'origine (inchangée)
  sync.js                 couche de synchro Turso <-> client
  macaisse.css            design d'origine
  assets/  logos/         images
scripts/                  générateurs (seed, markup)
```

Pour régénérer le seed ou le markup depuis les fichiers de `_design/` :

```bash
node scripts/gen-seed.cjs
node scripts/gen-markup.cjs
```
