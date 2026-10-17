"use client";
/**
 * Cruzamento de dados: o que nenhuma base sozinha mostra.
 *   - empresas devedoras cujos socios tambem devem como pessoa fisica
 *   - a mesma pessoa socia de varias empresas devedoras (grupo de fato)
 *   - busca de devedor pessoa fisica pelo nome
 * Todo vinculo socio-pessoa e por fragmento de CPF + nome: e indicio, e a
 * tela diz isso.
 */
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, Warning } from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { brl, num } from "@/lib/formato";
import { AvisoErro, Botao, Campo, Esqueleto, Selecao, Selo, Vazio } from "@/componentes/app/ui";

const UFS = ["", "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export default function Cruzamentos() {
  const [aba, setAba] = useState<"socios" | "grupos" | "pessoas">("socios");
  const [uf, setUf] = useState("");
  const [nome, setNome] = useState("");
  const [busca, setBusca] = useState("");

  const cruz = useQuery({ queryKey: ["cruz", aba, uf], queryFn: () => api(`/cruzamentos${qs({ tipo: aba, uf })}`), enabled: aba !== "pessoas" });
  const pessoas = useQuery({ queryKey: ["pessoas", busca, uf], queryFn: () => api(`/pessoas${qs({ nome: busca, uf })}`), enabled: aba === "pessoas" && busca.length >= 4 });
  const d: any = cruz.data;

  return (
    <div className="mx-auto max-w-[1200px] p-5 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Cruzamentos</h1>
          <p className="mt-0.5 text-sm text-aco">Dívida da empresa somada à dívida pessoal de quem a controla.</p>
        </div>
        <div className="w-32"><Selecao value={uf} onChange={(e) => setUf(e.target.value)} aria-label="Estado">
          {UFS.map((u) => <option key={u} value={u}>{u || "Todos os estados"}</option>)}
        </Selecao></div>
      </header>

      <div className="mt-5 flex gap-1 border-b border-linha" role="tablist">
        {([["socios", "Sócios devedores"], ["grupos", "Grupos de fato"], ["pessoas", "Pessoa física"]] as const).map(([k, r]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => setAba(k)}
            className={`cursor-pointer border-b-2 px-3 py-2 text-sm ${aba === k ? "border-acento font-medium" : "border-transparent text-aco hover:text-tinta"}`}>{r}</button>
        ))}
      </div>

      <p className="mt-3 flex gap-1.5 text-xs text-aco"><Warning size={14} className="shrink-0" />
        PGFN e Receita publicam o CPF mascarado (6 dígitos do meio). O vínculo é por esses dígitos mais o nome completo: é indício forte, não identificação. Confirme antes de agir.</p>

      <div className="mt-4">
        {aba !== "pessoas" && <AvisoErro erro={cruz.error} />}
        {aba !== "pessoas" && cruz.isLoading && <Esqueleto className="h-80" />}
        {aba !== "pessoas" && d?.sem_base && <Vazio titulo="Quadro societário ainda não carregado" texto={d.aviso} />}

        {aba === "socios" && d && !d.sem_base && (
          d.itens.length ? (
            <div className="overflow-x-auto rounded-[10px] border border-linha bg-papel">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="border-b border-linha text-left text-xs text-aco">
                  <th className="px-4 py-2.5 font-medium">Empresa</th><th className="py-2.5 font-medium">Sócios devedores</th>
                  <th className="py-2.5 text-right font-medium">Dívida da empresa</th><th className="py-2.5 text-right font-medium">Dos sócios</th>
                  <th className="px-4 py-2.5 text-right font-medium">Exposição</th>
                </tr></thead>
                <tbody>
                  {d.itens.map((x: any) => (
                    <tr key={x.cnpj_raiz} className="border-b border-linha last:border-0 hover:bg-acento-fundo/40">
                      <td className="px-4 py-2.5"><Link href={`/app/empresas/${x.cnpj}`} className="font-medium hover:underline">{x.nome}</Link>
                        <p className="text-xs text-aco">{[x.municipio, x.uf].filter(Boolean).join(" · ")}</p></td>
                      <td className="py-2.5 pr-3 text-xs">{x.nomes.slice(0, 3).join(", ")}{x.nomes.length > 3 && ` +${x.nomes.length - 3}`}
                        {!x.todos_alta && <Selo tom="alerta" className="ml-1">conferir</Selo>}</td>
                      <td className="py-2.5 text-right font-mono tabular">{brl(x.divida_empresa, true)}</td>
                      <td className="py-2.5 text-right font-mono tabular">{brl(x.divida_socios, true)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold tabular">{brl(x.exposicao_total, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Vazio titulo="Nenhum cruzamento neste recorte" />
        )}

        {aba === "grupos" && d && !d.sem_base && (
          d.itens.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {d.itens.map((g: any, i: number) => (
                <div key={i} className="rounded-[10px] border border-linha bg-papel p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-semibold">{g.nome}</p><p className="text-xs text-aco">CPF ***{g.fragmento}** · sócio de {num(g.empresas)} devedoras</p></div>
                    <p className="font-mono font-semibold tabular">{brl(g.divida_total, true)}</p>
                  </div>
                  <ul className="mt-3 divide-y divide-linha border-t border-linha">
                    {g.lista.slice(0, 6).map((e: any) => (
                      <li key={e.cnpj_raiz}><Link href={`/app/empresas/${e.cnpj_raiz}`} className="flex justify-between gap-2 py-1.5 text-sm hover:text-acento">
                        <span className="truncate">{e.nome} <span className="text-aco">· {e.uf}</span></span>
                        <span className="shrink-0 font-mono tabular text-aco">{brl(e.valor_total, true)}</span></Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : <Vazio titulo="Nenhum grupo neste recorte" />
        )}

        {aba === "pessoas" && (
          <div>
            <form className="flex max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); setBusca(nome.trim()); }}>
              <div className="relative flex-1">
                <MagnifyingGlass size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aco" />
                <Campo className="pl-8" placeholder="Nome completo ou parte (mín. 4 letras)" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <Botao type="submit" variante="primario">Buscar</Botao>
            </form>
            <p className="mt-2 text-xs text-aco">Dívida de pessoa física é dado pessoal. Use para análise do caso, não para abordagem em massa.</p>
            <div className="mt-4">
              <AvisoErro erro={pessoas.error} />
              {pessoas.isFetching && <Esqueleto className="h-40" />}
              {(pessoas.data as any)?.pessoas?.length === 0 && <Vazio titulo="Ninguém com esse nome na base" />}
              {(pessoas.data as any)?.pessoas?.length > 0 && (
                <ul className="divide-y divide-linha rounded-[10px] border border-linha bg-papel">
                  {(pessoas.data as any).pessoas.map((p: any) => (
                    <li key={p.documento + p.uf} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                      <span><span className="font-medium">{p.nome}</span> <span className="text-xs text-aco">· {p.documento} · {p.uf} · {num(p.qtd_inscricoes)} inscrições</span>
                        {p.tem_ajuizada && <Selo tom="alerta" className="ml-1">ajuizada</Selo>}</span>
                      <span className="font-mono tabular">{brl(p.valor_total, true)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
