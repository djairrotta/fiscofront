import Link from "next/link";
import type { Metadata } from "next";
import { RegistraSW } from "@/componentes/RegistraSW";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · fisco" },
  robots: { index: false, follow: false },   // painel nunca indexa
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "fisco" },
};

const NAV = [
  { href: "/app", rotulo: "Visão geral" },
  { href: "/app/mapa", rotulo: "Mapa" },
  { href: "/app/empresas", rotulo: "Empresas" },
  { href: "/app/teses", rotulo: "Teses" },
  { href: "/app/crm", rotulo: "Carteira" },
  { href: "/app/pecas", rotulo: "Peças" },
];

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row">
      <RegistraSW />
      {/* Densidade 8: navegacao estreita, sem ornamento. */}
      <aside className="hidden w-52 shrink-0 border-r border-linha bg-papel md:block">
        <div className="sticky top-0 p-4">
          <Link href="/" className="block px-2 py-2 text-[15px] font-semibold tracking-tight">fisco</Link>
          <nav className="mt-4 space-y-0.5">
            {NAV.map((i) => (
              <Link key={i.href} href={i.href}
                    className="block rounded-lg px-2.5 py-2 text-sm text-aco transition-colors hover:bg-acento-fundo hover:text-tinta">
                {i.rotulo}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-16 md:pb-0">{children}</main>

      {/* Navegacao inferior no celular: no maximo 5 itens. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-linha bg-papel md:hidden">
        {NAV.slice(0, 5).map((i) => (
          <Link key={i.href} href={i.href}
                className="flex min-h-[56px] flex-1 items-center justify-center px-1 text-[11px] text-aco">
            {i.rotulo}
          </Link>
        ))}
      </nav>
    </div>
  );
}
