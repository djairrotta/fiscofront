import Link from "next/link";
import { Botao } from "@/componentes/Botao";

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Navegacao em UMA linha no desktop, altura 64px. */}
      <header className="sticky top-0 z-40 border-b border-linha bg-fundo/95 backdrop-blur-xl supports-[backdrop-filter]:bg-fundo/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">fisco</Link>
          <nav className="hidden items-center gap-6 text-sm text-aco md:flex">
            <Link href="/empresas-devedoras" className="hover:text-tinta">Dados por cidade</Link>
            <Link href="/#recursos" className="hover:text-tinta">Recursos</Link>
            <Link href="/#teses" className="hover:text-tinta">Teses</Link>
            <Link href="/#planos" className="hover:text-tinta">Planos</Link>
            <Link href="/#duvidas" className="hover:text-tinta">Dúvidas</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/app" className="hidden text-sm text-aco hover:text-tinta sm:block">Entrar</Link>
            <Botao href="/#planos">Assinar</Botao>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-linha">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
            <div className="max-w-sm">
              <p className="text-[15px] font-semibold">fisco</p>
              <p className="mt-2 text-sm text-aco">
                Pesquisa de empresas e dívida federal sobre dados públicos. Um serviço
                do hub judinfo para contadores e gestores de empresas.
              </p>
            </div>
            <div className="text-sm">
              <p className="font-medium">Fontes</p>
              <ul className="mt-2 space-y-1 text-aco">
                <li>PGFN, Dados Abertos da Dívida Ativa</li>
                <li>Receita Federal, base de CNPJ</li>
                <li>SEF e AGE de Minas Gerais</li>
                <li>CNJ, DataJud e DJEN</li>
              </ul>
            </div>
          </div>
          <p className="mt-10 text-xs text-aco">
            Os dados exibidos são públicos e divulgados pelos próprios órgãos. O valor
            de dívida acompanha sempre a data de referência da base de origem.
          </p>
        </div>
      </footer>
    </>
  );
}
