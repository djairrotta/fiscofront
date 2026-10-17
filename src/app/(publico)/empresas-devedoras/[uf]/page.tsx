import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listarUfs, listarMunicipios } from "@/lib/dados";
import { slug, brl, num, posicao } from "@/lib/formato";
import { DadosEstruturados, conjuntoDados, trilha } from "@/componentes/DadosEstruturados";

export const revalidate = 3600;

// 27 paginas de estado, geradas no build.
export async function generateStaticParams() {
  const ufs = await listarUfs();
  return ufs.map((u) => ({ uf: u.uf.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<{ uf: string }> }): Promise<Metadata> {
  const { uf } = await params;
  const U = uf.toUpperCase();
  return {
    title: `Empresas com dívida ativa em ${U}`,
    description: `Quantas empresas têm dívida federal inscrita em ${U}, com valor consolidado e tributo. Dados públicos da PGFN.`,
    alternates: { canonical: `/empresas-devedoras/${uf.toLowerCase()}` },
  };
}

export default async function PaginaUf({ params }: { params: Promise<{ uf: string }> }) {
  const { uf } = await params;
  const U = uf.toUpperCase();

  const [ufs, municipios] = await Promise.all([listarUfs(), listarMunicipios(U)]);
  const estado = ufs.find((x) => x.uf === U);

  // 404 so quando o ESTADO nao existe na base. Antes a pagina caia
  // quando faltava municipio, e como municipio depende da base da
  // Receita, os 27 estados devolviam 404 mesmo com a divida da PGFN
  // inteira carregada.
  if (!estado) notFound();

  const temMunicipios = municipios.length > 0;
  const divida = Number(estado.divida_total ?? 0);
  const ref = estado.data_referencia ?? municipios[0]?.data_referencia ?? null;

  return (
    <>
      <DadosEstruturados json={conjuntoDados({
        nome: `Dívida ativa inscrita de empresas em ${U}`,
        descricao: `Empresas com inscrição em dívida ativa da União em ${U}, com valor consolidado. Fonte: PGFN.`,
        url: `/empresas-devedoras/${uf.toLowerCase()}`,
        dataRef: ref,
      })} />
      <DadosEstruturados json={trilha([
        { nome: "Empresas devedoras", url: "/empresas-devedoras" },
        { nome: U, url: `/empresas-devedoras/${uf.toLowerCase()}` },
      ])} />

      <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <nav className="text-sm text-aco">
          <Link href="/" className="hover:text-acento">Início</Link>
          {" / "}
          <Link href="/empresas-devedoras" className="hover:text-acento">Empresas devedoras</Link>
          {" / "}<span className="text-tinta">{U}</span>
        </nav>

        <h1 className="mt-5 text-3xl font-semibold tracking-tighter md:text-4xl">
          Empresas com dívida ativa em {U}
        </h1>

        <dl className="mt-8 grid gap-px overflow-hidden rounded-superficie border border-linha bg-linha sm:grid-cols-3">
          <div className="bg-papel p-5">
            <dt className="text-sm text-aco">Dívida inscrita</dt>
            <dd className="mt-1 font-mono text-2xl tracking-tight tabular">{brl(divida, true)}</dd>
          </div>
          <div className="bg-papel p-5">
            <dt className="text-sm text-aco">Empresas com inscrição</dt>
            <dd className="mt-1 font-mono text-2xl tracking-tight tabular">
              {num(Number(estado.empresas_com_divida ?? 0))}
            </dd>
          </div>
          <div className="bg-papel p-5">
            <dt className="text-sm text-aco">Posição da base</dt>
            <dd className="mt-1 font-mono text-2xl tracking-tight tabular">{posicao(ref) || "a carregar"}</dd>
          </div>
        </dl>

        <p className="mt-5 max-w-[70ch] text-sm leading-relaxed text-aco">
          Somamos apenas o devedor principal. A PGFN publica também o corresponsável,
          e contá-lo dobraria o valor da mesma inscrição.
        </p>

        {temMunicipios ? (
          <>
            <h2 className="mt-12 text-xl font-semibold tracking-tight">
              {num(municipios.length)} municípios
            </h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-linha text-left text-aco">
                  <tr>
                    <th className="py-2.5 font-medium">Município</th>
                    <th className="py-2.5 text-right font-medium">Empresas ativas</th>
                    <th className="py-2.5 text-right font-medium">Com dívida</th>
                    <th className="py-2.5 text-right font-medium">Dívida inscrita</th>
                  </tr>
                </thead>
                <tbody>
                  {municipios.map((m) => (
                    <tr key={m.municipio_ibge} className="border-b border-linha hover:bg-acento-fundo/40">
                      <td className="py-2.5">
                        <Link href={`/empresas-devedoras/${uf.toLowerCase()}/${slug(m.municipio)}`}
                          className="font-medium hover:text-acento">{m.municipio}</Link>
                      </td>
                      <td className="py-2.5 text-right font-mono tabular">{num(Number(m.empresas_ativas))}</td>
                      <td className="py-2.5 text-right font-mono tabular">{num(Number(m.empresas_com_divida))}</td>
                      <td className="py-2.5 text-right font-mono tabular">{brl(Number(m.divida_total), true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          // Estado honesto: a divida por UF ja existe, o recorte por
          // cidade depende do cadastro de CNPJ da Receita, que e outra base.
          <div className="mt-12 rounded-superficie border border-dashed border-linha p-8">
            <p className="font-medium">O recorte por município ainda não está disponível em {U}.</p>
            <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-aco">
              A PGFN publica a unidade federativa, não a cidade. O município vem do
              cadastro de CNPJ da Receita Federal, cruzado pela raiz do CNPJ, e essa
              carga é separada. O valor acima já é o inscrito real de {U}.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
