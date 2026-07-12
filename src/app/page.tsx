import { redirect } from "next/navigation";
import Script from "next/script";
import { getSession } from "@/lib/auth";
import { APP_MARKUP } from "./appMarkup";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      {/* Design d'origine, chargé uniquement une fois authentifié. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/macaisse.css" />

      {/* Voile pendant l'hydratation depuis Turso. */}
      <div id="cauris-boot">Chargement de vos données…</div>

      {/* Corps de l'application (markup du design, injecté verbatim). */}
      <div id="cauris-app" dangerouslySetInnerHTML={{ __html: APP_MARKUP }} />

      {/* La déconnexion est injectée dans la barre d'onglets par sync.js
          (voir injectLogout) pour épouser la mise en page du design. */}

      {/* Couche de synchronisation : hydrate depuis Turso, wrappe les écritures,
          puis injecte app.js (qui démarre en lisant l'état déjà en place). */}
      <Script src="/sync.js" strategy="afterInteractive" />
    </>
  );
}
