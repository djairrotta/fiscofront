import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  // Sem isto o Next elege /home/claude como raiz (ha outro lockfile la)
  // e o standalone sai aninhado em .next/standalone/repos/fisco-web,
  // quebrando qualquer execucao local do build.
  outputFileTracingRoot: __dirname,
  // NUNCA colocar API_URL em `env:` aqui. O `env` do next.config e
  // substituido no codigo NA HORA DO BUILD: o endereco da API virava uma
  // string fixa dentro do JS compilado e a variavel do EasyPanel era
  // ignorada em runtime. Resultado em producao: login 503 e tabelas
  // vazias, porque o build tinha cravado http://fisco-backend:3000, um
  // host que nao existe. Variavel de servidor se le em runtime.
  async headers() {
    return [
      { source: "/empresas-devedoras/:path*",
        headers: [{ key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=604800" }] },
      // O service worker do PWA precisa de escopo em /app. Na raiz ele
      // cacheia as paginas de SEO e atrapalha a revalidacao.
      { source: "/app/sw.js",
        headers: [{ key: "Service-Worker-Allowed", value: "/app/" },
                  { key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};
export default config;
