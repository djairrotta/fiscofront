import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listarUfs, listarMunicipios } from "@/lib/dados";
import { slug, brl, num, posicao } from "@/lib/formato";

export const revalidate = 86400;

// 27 paginas de estado, geradas no build.
export async function generateStaticParams() {
  const ufs = await listarUfs();
  return ufs.map(u => ({ uf: u.uf.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<{ uf: string }> }): Promise<Metadata> {
  const { uf } = await params;
  return {
    title: `Empresas com dívida ativa em ${uf.toUpperCase()} — por município`,
    description: `Quantas empresas têm dívida federal inscrita em cada município de ${uf.toUpperCase()}, com valores e tributos. Dados públicos da PGFN.`,
  };
}

export default async function PaginaUf({ params }: { params: Promise<{ uf: string }> }) {
  const { uf } = await params;
  const municipios = await listarMunicipios(uf.toUpperCase());
  if (!municipios.length) notFound();

  const totalDivida = municipios.reduce((s, m) => s + Number(m.divida_total ?? 0), 0);
  const ref = municipios[0]?.data_referencia ?? null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <nav className="text-sm text-aco">
        <Link href="/" className="hover:text-acento">Início</Link>
        {" / "}
        <Link href="/empresas-devedoras" className="hover:text-acento">Empresas devedoras</Link>
        {" / "}<span>{uf.toUpperCase()}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold">
        Empresas com dívida ativa em {uf.toUpperCase()}
      </h1>
      <p className="mt-2 text-aco">
        {municipios.length.toLocaleString("pt-BR")} municípios · {brl(totalDivida)} inscritos · {posicao(ref)}
      </p>

      <table className="mt-8 w-full text-sm">
        <thead className="border-b border-linha text-left text-aco">
          <tr>
            <th className="py-2">Município</th>
            <th className="text-right">Empresas ativas</th>
            <th className="text-right">Com dívida</th>
            <th className="text-right">Dívida inscrita</th>
          </tr>
        </thead>
        <tbody>
          {municipios.map(m => (
            <tr key={m.municipio_ibge} className="border-b border-linha hover:bg-acento-fundo/40">
              <td className="py-2">
                <Link href={`/empresas-devedoras/${uf}/${slug(m.municipio)}`}
                      className="font-medium hover:text-acento">
                  {m.municipio}
                </Link>
              </td>
              <td className="text-right">{Number(m.empresas_ativas).toLocaleString("pt-BR")}</td>
              <td className="text-right">{Number(m.empresas_com_divida).toLocaleString("pt-BR")}</td>
              <td className="text-right">{brl(Number(m.divida_total))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
