import type { MetadataRoute } from "next";

/**
 * O painel NUNCA indexa: /app e area logada e as paginas la dentro nao
 * tem conteudo publico. As paginas de cidade sao exatamente o contrario,
 * sao o ativo de busca do produto.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? "https://fisco.judinfo.com.br";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/app", "/app/", "/entrar", "/api/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
