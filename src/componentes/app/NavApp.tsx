"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartBar, MagnifyingGlass, Kanban, GitFork, Columns, NotePencil, MapTrifold, Scales, FileText, Handshake,
} from "@phosphor-icons/react";
import { Sair } from "@/componentes/Sair";

export const NAV = [
  { href: "/app", rotulo: "Painel", Icone: ChartBar },
  { href: "/app/pesquisa", rotulo: "Pesquisa", Icone: MagnifyingGlass },
  { href: "/app/leads", rotulo: "Leads", Icone: Kanban },
  { href: "/app/cruzamentos", rotulo: "Cruzamentos", Icone: GitFork },
  { href: "/app/acordos", rotulo: "Acordos", Icone: Handshake },
  { href: "/app/quadros", rotulo: "Quadros", Icone: Columns },
  { href: "/app/notas", rotulo: "Notas", Icone: NotePencil },
  { href: "/app/mapa", rotulo: "Mapa", Icone: MapTrifold },
  { href: "/app/teses", rotulo: "Teses", Icone: Scales },
  { href: "/app/pecas", rotulo: "Peças", Icone: FileText },
];

const ativo = (atual: string, href: string) => href === "/app" ? atual === "/app" : atual.startsWith(href);

export function NavLateral() {
  const atual = usePathname() || "";
  return (
    <aside className="hidden w-52 shrink-0 border-r border-linha bg-papel md:block">
      <div className="sticky top-0 flex h-[100dvh] flex-col p-3">
        <Link href="/" className="block px-2.5 py-2 text-[15px] font-semibold tracking-tight">fisco</Link>
        <nav className="mt-3 flex-1 space-y-0.5">
          {NAV.map(({ href, rotulo, Icone }) => {
            const a = ativo(atual, href);
            return (
              <Link key={href} href={href} aria-current={a ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  a ? "bg-acento-fundo font-medium text-tinta" : "text-aco hover:bg-acento-fundo/60 hover:text-tinta"}`}>
                <Icone size={17} weight={a ? "fill" : "regular"} className={a ? "text-acento dark:text-acento-claro" : ""} />
                {rotulo}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-linha pt-2"><Sair /></div>
      </div>
    </aside>
  );
}

const CELULAR = ["/app", "/app/pesquisa", "/app/leads", "/app/quadros", "/app/notas"];

export function NavInferior() {
  const atual = usePathname() || "";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-linha bg-papel md:hidden">
      {NAV.filter((n) => CELULAR.includes(n.href)).map(({ href, rotulo, Icone }) => {
        const a = ativo(atual, href);
        return (
          <Link key={href} href={href}
            className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] ${a ? "text-acento dark:text-acento-claro" : "text-aco"}`}>
            <Icone size={20} weight={a ? "fill" : "regular"} />
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
