/**
 * Identifiant de la version actuellement déployée.
 *
 * Sert à détecter un onglet resté ouvert avec un ancien app.js en mémoire :
 * un tel onglet ignore les nouveaux champs de données (ex. cycles.placements)
 * et peut, en sauvegardant, écraser silencieusement un état plus récent avec
 * une structure obsolète. Le client compare cette valeur à celle avec
 * laquelle il a démarré (cf. public/sync.js) et invite à recharger dès
 * qu'elles divergent — avant que l'onglet périmé n'ait l'occasion d'écrire.
 *
 * VERCEL_GIT_COMMIT_SHA change à chaque déploiement ; en local (ou si absent),
 * on retombe sur un identifiant figé au démarrage du process.
 */
export const APP_VERSION: string =
  process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || `dev-${Date.now()}`;
