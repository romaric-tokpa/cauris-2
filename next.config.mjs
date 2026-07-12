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
};

export default nextConfig;
