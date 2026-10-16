import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  env: { API_URL: process.env.API_URL ?? "http://fisco-backend:3000/api" },
  async headers() {
    return [
      { source: "/empresas-devedoras/:path*",
        headers: [{ key: "Cache-Control", value: "public, s-maxage=86400, stale-while-revalidate=604800" }] },
      // O service worker do PWA precisa de escopo em /app. Na raiz ele
      // cacheia as paginas de SEO e atrapalha a revalidacao.
      { source: "/app/sw.js",
        headers: [{ key: "Service-Worker-Allowed", value: "/app/" },
                  { key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};
export default config;
