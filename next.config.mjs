/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The vanilla client (public/app.js) reads window globals; nothing special needed.
  async headers() {
    return [
      {
        source: "/app.js",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/sync.js",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
  // Chaque onglet a sa propre URL. Ces chemins servent la même app (SPA) ;
  // app.js lit le pathname pour activer le bon onglet, et pushState met à jour
  // l'URL à la navigation. /backups reste une vraie page à part.
  async rewrites() {
    return [
      { source: "/suivi", destination: "/" },
      { source: "/operations", destination: "/" },
      { source: "/coffres", destination: "/" },
      { source: "/ventilation", destination: "/" },
      { source: "/bourse", destination: "/" },
    ];
  },
};

export default nextConfig;
