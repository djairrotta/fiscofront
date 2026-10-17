import type { Metadata } from "next";
import Link from "next/link";
import { FormularioEntrar } from "@/componentes/FormularioEntrar";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default async function Entrar({ searchParams }:
  { searchParams: Promise<{ destino?: string; novo?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="flex min-h-[100dvh] flex-col md:flex-row">
      {/* Coluna de contexto: quem chega aqui por redirecionamento precisa
          lembrar o que esta do outro lado. No celular ela some. */}
      <section className="hidden w-[44%] flex-col justify-between bg-acento p-10 text-white md:flex">
        <Link href="/" className="text-[15px] font-semibold tracking-tight">fisco</Link>
        <div>
          <p className="max-w-[26ch] text-3xl font-semibold tracking-tighter leading-[1.1]">
            A dívida já está no banco. Falta o seu nome na porta.
          </p>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-white/75">
            Dívida ativa da PGFN cruzada com o cadastro de CNPJ da Receita,
            por município e por tese.
          </p>
        </div>
        <p className="text-xs text-white/60">
          Dados públicos, divulgados pelos próprios órgãos.
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="text-[15px] font-semibold tracking-tight md:hidden">fisco</Link>
          <FormularioEntrar destino={sp.destino} comecaEm={sp.novo ? "registrar" : "login"} />
        </div>
      </section>
    </main>
  );
}
