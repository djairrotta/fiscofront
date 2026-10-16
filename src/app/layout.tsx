import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/estilos/globals.css";

export const metadata: Metadata = {
  title: { default: "fisco", template: "%s · fisco" },
  description:
    "Descubra quais empresas da sua cidade têm dívida tributária real antes de ligar para elas.",
  metadataBase: new URL(process.env.SITE_URL ?? "https://fisco.judinfo.com.br"),
};
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F9FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F14" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
