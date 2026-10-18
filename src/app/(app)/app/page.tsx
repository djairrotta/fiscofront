"use client";
/**
 * Painel interativo. Tudo clicavel leva a pesquisa ja filtrada: o painel
 * e a porta de entrada da prospeccao, nao um relatorio para olhar.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, X } from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { brl, num, posicao, dataBr, COR_FASE } from "@/lib/formato";
import { GraficoBarras, MapaUfs } from "@/componentes/app/Graficos";
import { AvisoErro, Esqueleto, Indicador, Superficie } from "@/componentes/app/ui";

const FAIXAS: Record<string, [number | null, number | null]> = {
  "até 10 mil": [null, 10000], "10 a 50 mil": [10000, 50000], "50 a 100 mil": [50000, 100000],
  "100 a 500 mil": [100000, 500000], "500 mil a 1 mi": [500000, 1000000], "1 a 5 mi": [1000000, 5000000],
  "5 a 50 mi": [5000000, 50000000], "acima de 50 mi": [50000000, null],
};

export default function Painel() {
  const router = useRouter();
  const [uf, setUf] = useState<string | null>(null);
  const painel = useQuery({ queryKey: ["painel", uf], queryFn: () => api(`/painel${qs({ uf })}`) });
  const funil = useQuery({ queryKey: ["leads-resumo"], queryFn: () => api("/leads-resumo") });
  const programas = useQuery({ queryKey: ["programas"], queryFn: () => api<any[]>("/programas"), staleTime: 3600_000 });
  const abertos = (programas.data ?? []).filter((p) => p.estado === "aberto").sort((a, b) => a.dias - b.dias);
  const d: any = painel.data;
  const ir = (f: Record<string, unknown>) => router.push(`/app/devedores${qs({ uf, ...f })}`);

  return (
    <div className="mx-auto max-w-[1400px] p-5 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Painel</h1>
          <p className="mt-0.5 text-sm text-aco">
            Dívida ativa federal de empresas {uf ? `em ${uf}` : "no Brasil"}
            {d?.totais?.data_referencia && <> · {posicao(d.totais.data_referencia)}</>}
          </p>
        </div>
        {uf && (
          <button type="button" onClick={() => setUf(null)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-linha bg-papel px-3 py-1 text-sm hover:bg-acento-fundo">
            {uf} <X size={13} />
          </button>
        )}
      </header>

      <div className="mt-5"><AvisoErro erro={painel.error} /></div>

      {abertos.length > 0 && (
        <Link href="/app/acordos" className="mt-4 block rounded-[10px] border border-linha bg-papel px-5 py-4 hover:bg-acento-fundo/40">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold">{abertos.length} programas de transação com adesão aberta</p>
            <span className="text-xs text-acento dark:text-acento-claro">Acordos e parcelamentos →</span>
          </div>
          <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {abertos.slice(0, 4).map((p) => (
              <li key={p.slug} className="flex justify-between gap-3">
                <span className="truncate text-aco">{p.nome}</span>
                <span className="shrink-0 font-mono text-xs tabular">até {dataBr(p.adesao_fim)}</span>
              </li>
            ))}
          </ul>
        </Link>
      )}

      {/* Indicadores */}
      <div className="mt-4 grid gap-px overflow-hidden rounded-[10px] border border-linha bg-linha sm:grid-cols-2 lg:grid-cols-4">
        {painel.isLoading ? [0, 1, 2, 3].map((i) => <div key={i} className="bg-papel p-5"><Esqueleto className="h-10" /></div>) : d && (
          <>
            <Indicador rotulo="Dívida inscrita" valor={brl(d.totais.valor_total, true)}
              detalhe={`${num(d.totais.inscricoes)} inscrições`} />
            <Indicador rotulo="Empresas devedoras" valor={num(d.totais.empresas)}
              detalhe={Number(d.totais.com_contato) > 0 ? `${num(d.totais.com_contato)} com telefone ou e-mail na base` : "contato consultado na ficha, por CNPJ"} />
            <Indicador rotulo="Já ajuizada" valor={brl(d.totais.valor_ajuizado, true)}
              detalhe={`${num(d.totais.empresas_ajuizadas)} empresas com execução`} />
            <button type="button" onClick={() => ir({ acordo: "rescindido" })} className="cursor-pointer text-left hover:bg-acento-fundo/40">
              <Indicador rotulo="Parcelamento rescindido" valor={num(d.totais.com_rescisao ?? 0)}
                detalhe={`empresas com acordo que caiu · ${num(d.totais.sem_acordo ?? 0)} sem acordo nenhum`} />
            </button>
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr] [&>*]:min-w-0">
        <Superficie titulo="Por estado" acao={<span className="text-xs text-aco">clique para filtrar</span>}>
          <div className="p-4">
            {d ? <MapaUfs dados={d.por_uf} selecionada={uf} aoEscolher={setUf} /> : <Esqueleto className="h-72" />}
          </div>
        </Superficie>

        <Superficie titulo="Tamanho da dívida por empresa" acao={<span className="text-xs text-aco">nº de empresas por faixa</span>}>
          <div className="p-4">
            {d ? (
              <GraficoBarras dados={d.faixas} x="faixa" y="empresas" formatar={(v) => num(v)}
                aoClicar={(l) => { const [a, b] = FAIXAS[l.faixa] ?? []; ir({ valor_min: a, valor_max: b }); }} />
            ) : <Esqueleto className="h-60" />}
          </div>
        </Superficie>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Superficie titulo="Ano da inscrição mais antiga" acao={<span className="text-xs text-aco">dívida total por ano</span>}>
          <div className="p-4">
            {d ? <GraficoBarras dados={d.por_ano} x="ano" y="valor_total"
              aoClicar={(l) => ir({ desde: l.ano, ate: l.ano })} /> : <Esqueleto className="h-60" />}
          </div>
        </Superficie>
        <Superficie titulo="Por tributo principal">
          <div className="p-4">
            {d ? <GraficoBarras dados={d.por_tributo} x="tributo" y="valor_total" horizontal
              altura={Math.max(120, d.por_tributo.length * 34)} aoClicar={(l) => ir({ tributo: l.tributo })} /> : <Esqueleto className="h-60" />}
          </div>
        </Superficie>
      </div>

      {(d?.por_regime?.length > 0 || d?.por_porte?.length > 0) && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          <Superficie titulo="Por regime tributário" acao={<span className="text-xs text-aco">nº de empresas</span>}>
            <div className="p-4">
              <GraficoBarras horizontal altura={140} formatar={(v) => num(v)} x="rotulo" y="empresas"
                dados={d.por_regime.map((r: any) => ({ ...r, rotulo: ({ mei: "MEI", simples: "Simples Nacional", demais: "Fora do Simples" } as any)[r.regime] }))}
                aoClicar={(l) => ir({ regime: l.regime })} />
            </div>
          </Superficie>
          <Superficie titulo="Por porte" acao={<span className="text-xs text-aco">nº de empresas</span>}>
            <div className="p-4">
              <GraficoBarras horizontal altura={140} formatar={(v) => num(v)} x="rotulo" y="empresas"
                dados={d.por_porte.map((r: any) => ({ ...r, rotulo: ({ 1: "Microempresa", 3: "Pequeno porte", 5: "Demais" } as any)[r.porte] }))}
                aoClicar={(l) => ir({ porte: l.porte })} />
            </div>
          </Superficie>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <Superficie titulo="Maiores devedoras"
          acao={<Link href={`/app/devedores${qs({ uf })}`} className="inline-flex items-center gap-1 text-xs text-acento hover:underline dark:text-acento-claro">Ver todas <ArrowRight size={12} /></Link>}>
          <table className="w-full text-sm">
            <tbody>
              {(d?.top_devedores ?? []).map((e: any) => (
                <tr key={e.cnpj_raiz} className="cursor-pointer border-b border-linha last:border-0 hover:bg-acento-fundo/40"
                  onClick={() => router.push(`/app/empresas/${e.cnpj}`)}>
                  <td className="w-full max-w-0 px-4 py-2.5">
                    <p className="truncate font-medium">{e.nome}</p>
                    <p className="truncate text-xs text-aco">{[e.municipio, e.uf].filter(Boolean).join(" · ")} · {e.tributo_principal}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular">{brl(e.valor_total, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!d && <div className="p-4"><Esqueleto className="h-48" /></div>}
        </Superficie>

        <div className="space-y-4">
          <Superficie titulo="Seu funil"
            acao={<Link href="/app/leads" className="inline-flex items-center gap-1 text-xs text-acento hover:underline dark:text-acento-claro">Abrir leads <ArrowRight size={12} /></Link>}>
            <ul className="divide-y divide-linha">
              {(funil.data as any)?.fases?.map((f: any) => (
                <li key={f.valor} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${COR_FASE[f.cor] ?? "bg-slate-400"}`} />{f.rotulo}
                  </span>
                  <span className="font-mono tabular text-aco">{num(f.leads)} · {brl(f.divida, true)}</span>
                </li>
              ))}
            </ul>
          </Superficie>
          {(funil.data as any)?.proximos?.length > 0 && (
            <Superficie titulo="Próximos passos">
              <ul className="divide-y divide-linha">
                {(funil.data as any).proximos.map((p: any) => (
                  <li key={p.id}>
                    <Link href={`/app/leads?lead=${p.id}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-acento-fundo/40">
                      <span className="min-w-0"><span className="block truncate font-medium">{p.nome}</span>
                        <span className="block truncate text-xs text-aco">{p.proximo_passo}</span></span>
                      <span className="shrink-0 font-mono text-xs tabular text-aco">{dataBr(p.proximo_em)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Superficie>
          )}
          {d?.top_municipios?.length > 0 && (
            <Superficie titulo="Cidades com mais dívida">
              <ul className="divide-y divide-linha">
                {d.top_municipios.slice(0, 8).map((m: any) => (
                  <li key={m.municipio_ibge}>
                    <button type="button" onClick={() => router.push(`/app/devedores${qs({ municipio: m.municipio_ibge })}`)}
                      className="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-left text-sm hover:bg-acento-fundo/40">
                      <span>{m.municipio} <span className="text-aco">· {m.uf}</span></span>
                      <span className="font-mono tabular text-aco">{brl(m.valor_total, true)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Superficie>
          )}
        </div>
      </div>

      {d?.estadual_sp && Number(d.estadual_sp.empresas) > 0 && (
        <button type="button" onClick={() => ir({ estadual: "sp" })}
          className="mt-4 flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 rounded-[10px] border border-linha bg-papel px-5 py-4 text-left hover:bg-acento-fundo/40">
          <span>
            <span className="block text-xs text-aco">Dívida estadual de SP (empresas que negociaram com a PGE-SP)</span>
            <span className="font-mono text-lg font-semibold tabular">{brl(d.estadual_sp.valor_total, true)}</span>
            <span className="ml-2 text-sm text-aco">{num(d.estadual_sp.empresas)} empresas · {num(d.estadual_sp.rompidos)} com acordo rompido</span>
          </span>
          <span className="text-xs text-acento dark:text-acento-claro">Ver na pesquisa →</span>
        </button>
      )}

      {d?.pessoas_fisicas && Number(d.pessoas_fisicas.pessoas) > 0 && (
        <p className="mt-4 text-xs text-aco">
          Além das empresas, {num(d.pessoas_fisicas.pessoas)} pessoas físicas somam {brl(d.pessoas_fisicas.valor_total, true)} inscritos
          {uf ? ` em ${uf}` : ""}. Elas aparecem nos <Link href="/app/cruzamentos" className="text-acento underline dark:text-acento-claro">cruzamentos</Link>, ligadas às empresas de que são sócias.
        </p>
      )}
    </div>
  );
}
