import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listarUfs, listarMunicipios, buscarMunicipio } from "@/lib/dados";
import { slug, brl, num, posicao } from "@/lib/formato";

export const revalidate = 86400;
export const dynamicParams = true;   // 5.570 paginas: as menores entram sob demanda

/**
 * Gera no build as cidades de maior volume de cada estado; o restante
 * e servido por ISR na primeira visita e fica em cache. Build de 5.570
 * paginas de uma vez e desnecessario e lento.
 */
export async function generateStaticParams() {
  const ufs = await listarUfs();
  const out: { uf: string; cidade: string }[] = [];
  for (const u of ufs) {
    const m = await listarMunicipios(u.uf);
    for (const x of m.slice(0, 40)) {
      out.push({ uf: u.uf.toLowerCase(), cidade: slug(x.municipio) });
    }
  }
  return out;
}

async function resolver(uf: string, cidade: string) {
  const lista = await listarMunicipios(uf.toUpperCase());
  const m = lista.find(x => slug(x.municipio) === cidade);
  return m ? buscarMunicipio(uf.toUpperCase(), m.municipio_ibge) : null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ uf: string; cidade: string }> }
): Promise<Metadata> {
  const { uf, cidade } = await params;
  const m = await resolver(uf, cidade);
  if (!m) return {};
  return {
    title: `Empresas com dívida ativa em ${m.municipio} (${uf.toUpperCase()})`,
    description: `${Number(m.empresas_com_divida).toLocaleString("pt-BR")} empresas de ${m.municipio} têm dívida federal inscrita, somando ${brl(Number(m.divida_total))}. Distribuição por tributo e porte.`,
  };
}

export default async function PaginaCidade(
  { params }: { params: Promise<{ uf: string; cidade: string }> }
) {
  const { uf, cidade } = await params;
  const m = await resolver(uf, cidade);
  if (!m) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Dívida ativa de empresas em ${m.municipio} (${uf.toUpperCase()})`,
    description: `Agregado de dívida federal inscrita por empresa no município de ${m.municipio}.`,
    temporalCoverage: m.data_referencia,
    creator: { "@type": "Organization", name: "fisco" },
    isBasedOn: "https://dadosabertos.pgfn.gov.br",
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <script type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <nav className="text-sm text-aco">
        <Link href="/" className="hover:text-acento">Início</Link>{" / "}
        <Link href={`/empresas-devedoras/${uf}`} className="hover:text-acento">
          {uf.toUpperCase()}
        </Link>{" / "}<span>{m.municipio}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold">
        Empresas com dívida ativa em {m.municipio}
      </h1>
      <p className="mt-2 text-aco">{posicao(m.data_referencia)}</p>

      <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
        <div><dt className="text-sm text-aco">Ativas</dt>
          <dd className="text-xl font-semibold">{Number(m.empresas_ativas).toLocaleString("pt-BR")}</dd></div>
        <div><dt className="text-sm text-aco">Com dívida</dt>
          <dd className="text-xl font-semibold">{Number(m.empresas_com_divida).toLocaleString("pt-BR")}</dd></div>
        <div><dt className="text-sm text-aco">Total inscrito</dt>
          <dd className="text-xl font-semibold">{brl(Number(m.divida_total))}</dd></div>
        <div><dt className="text-sm text-aco">Mediana</dt>
          <dd className="text-xl font-semibold">{brl(Number(m.divida_mediana))}</dd></div>
      </dl>

      {!!m.tributos?.length && (
        <>
          <h2 className="mt-12 text-xl font-semibold">Distribuição por tributo</h2>
          <table className="mt-4 w-full text-sm">
            <thead className="border-b border-linha text-left text-aco">
              <tr><th className="py-2">Tributo</th>
                  <th className="text-right">Empresas</th>
                  <th className="text-right">Valor inscrito</th></tr>
            </thead>
            <tbody>
              {m.tributos.map(t => (
                <tr key={t.tributo} className="border-b border-linha">
                  <td className="py-2">{t.tributo}</td>
                  <td className="text-right">{Number(t.empresas).toLocaleString("pt-BR")}</td>
                  <td className="text-right">{brl(Number(t.valor))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="mt-12 rounded-[10px] border border-linha bg-papel p-6">
        <p className="font-medium">Quer ver quais empresas são, com CNPJ e tese aplicável?</p>
        <p className="mt-1 text-sm text-aco">
          O agregado desta página é público. O CNPJ individual fica no painel.
        </p>
        <Link href="/planos"
              className="mt-4 inline-block botao-liquido inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold text-white">
          Ver planos — a partir de R$ 49/mês
        </Link>
      </div>

      <p className="mt-8 text-xs text-aco">
        Fonte: Dados Abertos da PGFN e base de CNPJ da Receita Federal. Valores de
        devedor principal, {posicao(m.data_referencia)}.
      </p>
    </main>
  );
}
