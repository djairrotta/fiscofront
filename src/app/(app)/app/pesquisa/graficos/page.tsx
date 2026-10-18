"use client";
/**
 * Gráficos da pesquisa: o mesmo conjunto de filtros da pesquisa de
 * empresas, visto de cima. Um gráfico por pergunta (onde estão, o que
 * fazem, quando abriram, de que tamanho, como contatar, quanto devem).
 * Clicar numa barra volta para a pesquisa já com aquele recorte.
 */
import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Info } from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { brl, num } from "@/lib/formato";
import { AvisoErro, Esqueleto, Indicador, Superficie, Vazio } from "@/componentes/app/ui";
import { GraficoBarras, MapaUfs } from "@/componentes/app/Graficos";

const GRUPO_NAT: Record<string, string> = {
  empresario: "Empresário individual", sociedade: "Sociedade", sem_fins: "Sem fins lucrativos",
  publica: "Pública", pessoa_fisica: "Pessoa física", outras: "Outras",
};
const PORTE_COD: Record<string, string> = { ME: "1", EPP: "3", Demais: "5" };
const REGIME_COD: Record<string, string> = { MEI: "mei", Simples: "simples", "Fora do Simples": "demais" };
const mesCurto = (m: string) => { const [a, b] = m.split("-"); return `${b}/${a.slice(2)}`; };
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–");
const qtd = (v: number) => num(Math.round(v));

function S({ titulo, className = "", children }: { titulo: string; className?: string; children: React.ReactNode }) {
  return <Superficie titulo={titulo} className={className}><div className="p-4">{children}</div></Superficie>;
}

/** Pontos por município, projeção simples (lon/lat) sobre o contorno do Brasil. */
function MapaPontos({ dados }: { dados: { chave: string; n: number; lat: number | null; lon: number | null }[] }) {
  const pts = dados.filter((d) => d.lat != null && d.lon != null);
  if (!pts.length) return <p className="py-10 text-center text-sm text-aco">Sem coordenadas para estes municípios.</p>;
  const W = 360, H = 380, x = (lon: number) => ((lon + 74.5) / 40.5) * W, y = (lat: number) => ((6 - lat) / 40) * H;
  const max = Math.max(...pts.map((p) => Number(p.n)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[420px]" role="img" aria-label="Empresas por município no mapa">
      <rect width={W} height={H} rx={10} fill="var(--color-fundo)" />
      {[...pts].sort((a, b) => Number(b.n) - Number(a.n)).map((p) => (
        <circle key={p.chave} cx={x(Number(p.lon))} cy={y(Number(p.lat))} r={2 + Math.sqrt(Number(p.n) / max) * 16}
          fill="var(--color-grafico)" fillOpacity={0.45} stroke="var(--color-papel)" strokeWidth={1}>
          <title>{`${p.chave}: ${qtd(Number(p.n))} empresas`}</title>
        </circle>
      ))}
    </svg>
  );
}

function Conteudo() {
  const sp = useSearchParams();
  const router = useRouter();
  const filtros = useMemo(() => Object.fromEntries([...sp.entries()].filter(([k, v]) => v && k !== "pagina")), [sp]);
  const g = useQuery({ queryKey: ["busca-graficos", filtros], queryFn: () => api<any>(`/busca/graficos${qs(filtros)}`), staleTime: 300_000 });
  const ref = useQuery({ queryKey: ["busca-ref"], queryFn: () => api<any>("/busca/referencias"), staleTime: Infinity });
  const secoes = new Map<string, string>((ref.data?.secoes ?? []).map((s: any) => [s.codigo, s.descricao]));
  const ir = (extra: Record<string, string>) => router.push(`/app/pesquisa${qs({ ...filtros, ...extra })}`);
  const d = g.data;
  const T = Number(d?.total) || 0;
  const conv = (l: any[] | undefined, rot?: (c: string) => string) => (l ?? []).map((x: any) => ({ ...x, chave: rot ? rot(String(x.chave)) : String(x.chave), n: Number(x.n) }));

  return (
    <div className="mx-auto max-w-[1440px] p-5 md:p-8">
      <Link href={`/app/pesquisa${qs(filtros)}`} className="inline-flex items-center gap-1 text-sm text-aco hover:text-tinta"><ArrowLeft size={14} /> Voltar para a pesquisa</Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Gráficos da pesquisa</h1>
      <p className="mt-0.5 text-sm text-aco">Clique numa barra para abrir a pesquisa com aquele recorte.</p>
      <AvisoErro erro={g.error} />
      {d?.estimativa && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-acento-fundo px-3 py-1.5 text-xs">
          <Info size={13} /> Conjunto grande: números estimados a partir de uma amostra de {d.amostra_pct}% da base. As proporções valem; o total é aproximado.
        </p>
      )}

      {g.isLoading ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Esqueleto key={i} className="h-72" />)}</div>
      ) : !d || T === 0 ? (
        <div className="mt-6"><Vazio titulo="Nenhuma empresa com esses filtros" texto="Volte para a pesquisa e afrouxe algum filtro." /></div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Indicador rotulo="Empresas" valor={qtd(T)} detalhe={d.estimativa ? "estimativa" : undefined} />
            <Indicador rotulo="Com e-mail" valor={pct(d.contato.email, T)} detalhe={`${qtd(d.contato.email)} (sem o do contador)`} />
            <Indicador rotulo="Com celular" valor={pct(d.contato.celular, T)} detalhe={`${qtd(d.contato.celular)} · WhatsApp provável`} />
            <Indicador rotulo="Com dívida federal" valor={pct(d.divida.com, T)} detalhe={`${qtd(d.divida.com)} empresas`} />
            <Indicador rotulo="Dívida somada" valor={brl(Number(d.divida.valor), true)} detalhe={`${qtd(d.divida.ajuizada)} ajuizadas`} />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {d.por_municipio.length > 1 && (<>
            {d.por_uf.length > 1 && <S titulo="Por estado">
              <MapaUfs dados={conv(d.por_uf).map((x) => ({ uf: x.chave, valor_total: x.n, empresas: x.n }))}
                selecionada={filtros.uf && !filtros.uf.includes(",") ? filtros.uf : null}
                aoEscolher={(uf) => uf && ir({ uf, municipio: "" })} formatar={(v) => `${qtd(v)} empresas`} rotulo="Empresas por estado" />
            </S>}
            <S titulo="Mapa por município"><MapaPontos dados={d.por_municipio} /></S>
            <S titulo="Municípios com mais empresas">
              <GraficoBarras dados={conv(d.por_municipio).slice(0, 15)} x="chave" y="n" horizontal altura={360} formatar={qtd}
                aoClicar={(l) => ir({ municipio: l.ibge })} />
            </S>
            <S titulo="Densidade: empresas por mil habitantes">
              <GraficoBarras altura={360} horizontal x="chave" y="por_mil" formatar={(v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                dados={conv(d.por_municipio).filter((x) => x.por_mil != null && Number(x.populacao) >= 20000)
                  .map((x) => ({ ...x, por_mil: Number(x.por_mil) })).sort((a, b) => b.por_mil - a.por_mil).slice(0, 15)}
                aoClicar={(l) => ir({ municipio: l.ibge })} />
              <p className="mt-1 text-[11px] text-aco">Municípios com 20 mil habitantes ou mais (população do IBGE).</p>
            </S>
            </>)}
            <S titulo="Bairros com mais empresas">
              <GraficoBarras dados={conv(d.por_bairro).slice(0, 15).map((b) => (d.por_municipio.length === 1 ? { ...b, chave: b.chave.split(" · ")[0] } : b))} x="chave" y="n" horizontal altura={360} formatar={qtd} />
            </S>
            <S titulo="Setor (seção da CNAE)">
              <GraficoBarras dados={conv(d.por_secao).map((x) => ({ ...x, codigo: x.chave, chave: secoes.get(x.chave) ?? x.chave })).slice(0, 12)}
                x="chave" y="n" horizontal altura={360} formatar={qtd} aoClicar={(l) => ir({ cnae: "", secao: l.codigo })} />
            </S>
            <S titulo="Atividades principais mais comuns" className="md:col-span-2">
              <GraficoBarras dados={conv(d.por_cnae).map((x) => ({ ...x, chave: (x.chave || x.codigo).slice(0, 60) })).slice(0, 15)}
                x="chave" y="n" horizontal altura={420} formatar={qtd} aoClicar={(l) => ir({ cnae: l.codigo })} />
            </S>
            <S titulo="Regime">
              <GraficoBarras dados={conv(d.por_regime)} x="chave" y="n" formatar={qtd} aoClicar={(l) => ir({ regime: REGIME_COD[l.chave] ?? "" })} />
            </S>
            <S titulo="Aberturas por mês (5 anos)" className="md:col-span-2">
              <GraficoBarras dados={conv(d.abertura_mes, mesCurto)} x="chave" y="n" formatar={qtd} altura={260} />
            </S>
            <S titulo="Porte">
              <GraficoBarras dados={conv(d.por_porte)} x="chave" y="n" formatar={qtd} aoClicar={(l) => PORTE_COD[l.chave] && ir({ porte: PORTE_COD[l.chave] })} />
            </S>
            <S titulo="Aberturas por ano" className="md:col-span-2">
              <GraficoBarras dados={conv(d.abertura_ano).filter((x) => Number(x.chave) >= 1970)} x="chave" y="n" formatar={qtd} altura={260} />
            </S>
            <S titulo="Idade da empresa">
              <GraficoBarras dados={conv(d.por_idade)} x="chave" y="n" formatar={qtd} horizontal altura={240} />
            </S>
            {d.baixa_mes?.length > 0 && (
              <S titulo="Baixas por mês" className="md:col-span-2">
                <GraficoBarras dados={conv(d.baixa_mes, mesCurto)} x="chave" y="n" formatar={qtd} altura={240} />
              </S>
            )}
            <S titulo="Natureza jurídica">
              <GraficoBarras dados={conv(d.por_natureza, (c) => GRUPO_NAT[c] ?? c)} x="chave" y="n" formatar={qtd} horizontal altura={240} />
            </S>
            <S titulo="Capital social">
              <GraficoBarras dados={conv(d.por_capital)} x="chave" y="n" formatar={qtd} horizontal altura={240} />
            </S>
            <S titulo="Quadro de sócios">
              <GraficoBarras dados={conv(d.por_socios)} x="chave" y="n" formatar={qtd} horizontal altura={220} />
            </S>
            <S titulo="Situação cadastral">
              <GraficoBarras dados={conv(d.por_situacao)} x="chave" y="n" formatar={qtd} />
            </S>
            <S titulo="Matriz e filiais">
              <GraficoBarras dados={conv(d.por_tipo)} x="chave" y="n" formatar={qtd} aoClicar={(l) => ir({ matriz: l.chave === "Matriz" ? "matriz" : "filial" })} />
            </S>
            <S titulo="Como contatar">
              <GraficoBarras x="chave" y="n" formatar={qtd} horizontal altura={200} dados={[
                { chave: "Com e-mail", n: d.contato.email, f: "email" }, { chave: "Com telefone", n: d.contato.telefone, f: "telefone" },
                { chave: "Com celular", n: d.contato.celular, f: "celular" }, { chave: "Sem contato", n: d.contato.nenhum },
              ].map((x) => ({ ...x, n: Number(x.n) }))} aoClicar={(l) => l.f && ir({ contato: l.f, ocultar_contador: "1" })} />
            </S>
            <S titulo="Dívida ativa federal">
              <GraficoBarras x="chave" y="n" formatar={qtd} altura={200} dados={[
                { chave: "Com dívida", n: Number(d.divida.com), f: "com" }, { chave: "Sem dívida", n: Number(d.divida.sem), f: "sem" },
              ]} aoClicar={(l) => ir({ divida: l.f })} />
            </S>
            {d.divida.com > 0 && (
              <S titulo="Tamanho da dívida">
                <GraficoBarras dados={conv(d.por_faixa_divida)} x="chave" y="n" formatar={qtd} horizontal altura={220} />
              </S>
            )}
            {d.sinais && d.divida.com > 0 && (
              <S titulo="Momento da dívida">
                <GraficoBarras x="chave" y="n" formatar={qtd} horizontal altura={260} dados={[
                  ["nova_tri", "Inscrição nova no trimestre"], ["nova_12m", "Inscrição nova em 12 meses"], ["rescindiu", "Acordo caiu (12 meses)"],
                  ["negociou", "Negociou no trimestre"], ["cresceu", "Dívida cresceu 10%+"], ["caiu", "Dívida caiu 10%+"],
                ].map(([k, r]) => ({ chave: r, n: Number(d.sinais[k]) || 0, f: k }))} aoClicar={(l) => ir({ sinal: l.f })} />
              </S>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function GraficosPesquisa() {
  return <Suspense><Conteudo /></Suspense>;
}
