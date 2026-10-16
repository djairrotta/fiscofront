import type { MetadataRoute } from "next";
import { listarUfs, listarMunicipios } from "@/lib/dados";
import { slug } from "@/lib/formato";

/** 27 UFs + 5.570 municipios. O conteudo e real e unico em cada uma. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "https://fisco.judinfo.com.br";
  const ufs = await listarUfs();
  const urls: MetadataRoute.Sitemap = [
    { url: base, priority: 1 },
    { url: `${base}/empresas-devedoras`, priority: 0.9 },
  ];
  for (const u of ufs) {
    const uf = u.uf.toLowerCase();
    urls.push({ url: `${base}/empresas-devedoras/${uf}`, priority: 0.8 });
    for (const m of await listarMunicipios(u.uf)) {
      urls.push({
        url: `${base}/empresas-devedoras/${uf}/${slug(m.municipio)}`,
        priority: 0.6,
        lastModified: m.data_referencia ? new Date(m.data_referencia) : undefined,
      });
    }
  }
  return urls;
}
