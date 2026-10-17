import Link from "next/link";
import type { Metadata } from "next";
import { listarUfs } from "@/lib/dados";
import { brl, num, posicao } from "@/lib/formato";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Empresas com dívida ativa por estado",
  description:
    "Quantas empresas têm dívida federal inscrita em cada estado e município do Brasil, com valores e tributos. Dados públicos da PGFN.",
};

export default async function Indice() {
  const ufs = await listarUfs();
  const ref = ufs[0]?.data_referencia ?? null;
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Empresas com dívida ativa, por estado
      </h1>
      <p className="mt-3 text-aco">{posicao(ref)}</p>
      <table className="mt-10 w-full text-sm">
        <thead>
          <tr className="border-b border-linha text-left text-aco">
            <th className="pb-3 font-medium">Estado</th>
            <th className="pb-3 text-right font-medium">Municípios</th>
            <th className="pb-3 text-right font-medium">Com dívida</th>
            <th className="pb-3 text-right font-medium">Total inscrito</th>
          </tr>
        </thead>
        <tbody>
          {ufs.map((u) => (
            <tr key={u.uf} className="border-b border-linha">
              <td className="py-3">
                <Link href={`/empresas-devedoras/${u.uf.toLowerCase()}`}
                      className="font-medium hover:text-acento">{u.uf}</Link>
              </td>
              <td className="py-3 text-right font-mono tabular text-aco">{num(u.municipios)}</td>
              <td className="py-3 text-right font-mono tabular text-aco">{num(u.empresas_com_divida)}</td>
              <td className="py-3 text-right font-mono tabular">{brl(u.divida_total, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
