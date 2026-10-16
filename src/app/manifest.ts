import type { MetadataRoute } from "next";

/**
 * PWA ESCOPADO EM /app. O start_url e o scope apontam para /app — o painel
 * e o que faz sentido instalar no celular (ver lead salvo, receber alerta de
 * publicacao nova). A landing continua sendo pagina web indexavel.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "fisco — prospecção tributária",
    short_name: "fisco",
    description: "Leads tributários, teses e peças do seu escritório.",
    start_url: "/app",
    scope: "/app/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F9FA",
    theme_color: "#0F5B56",
    lang: "pt-BR",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-mascara.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
