"use client";
/**
 * Histórico de pesquisas: cada pesquisa de empresas feita vira um cartão
 * com os filtros, quantas empresas trouxe e quando. Abrir, ver gráficos,
 * salvar com nome ou apagar.
 */
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookmarkSimple, ChartBar, ClockCounterClockwise, MagnifyingGlass, Trash } from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { num } from "@/lib/formato";
import { resumoFiltros } from "@/lib/busca";
import { AvisoErro, Botao, Campo, Esqueleto, Vazio } from "@/componentes/app/ui";

const quando = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function HistoricoPesquisas() {
  const qc = useQueryClient();
  const h = useQuery({ queryKey: ["busca-historico"], queryFn: () => api<any[]>("/busca/historico") });
  const cods = [...new Set((h.data ?? []).flatMap((x) => (x.filtros.municipio ? x.filtros.municipio.split(",") : [])))];
  const cid = useQuery({
    queryKey: ["cidades-nomes", cods.join(",")], enabled: cods.length > 0, staleTime: Infinity,
    queryFn: () => api<any[]>(`/municipios${qs({ ids: cods.join(",") })}`).catch(() => []),
  });
  const nomes = new Map<string, string>((cid.data ?? []).map((c: any) => [String(c.ibge), `${c.nome}/${c.uf}`]));
  const apagar = useMutation({ mutationFn: (k: string) => api(`/busca/historico/${k}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["busca-historico"] }) });
  const salvar = useMutation({
    mutationFn: ({ nome, filtros }: any) => api("/buscas", { method: "POST", json: { nome, filtros: { ...filtros, _tipo: "empresas" } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buscas"] }),
  });
  const [nomeando, setNomeando] = useState<string | null>(null);
  const [nome, setNome] = useState("");

  return (
    <div className="mx-auto max-w-[1200px] p-5 md:p-8">
      <Link href="/app/pesquisa" className="inline-flex items-center gap-1 text-sm text-aco hover:text-tinta"><ArrowLeft size={14} /> Pesquisa de empresas</Link>
      <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold tracking-tight"><ClockCounterClockwise size={20} /> Histórico de pesquisas</h1>
      <p className="mt-0.5 text-sm text-aco">As últimas 60 pesquisas que você fez. A mesma pesquisa repetida atualiza o cartão.</p>
      <AvisoErro erro={h.error} />
      <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {h.isLoading && Array.from({ length: 6 }).map((_, i) => <li key={i}><Esqueleto className="h-40" /></li>)}
        {h.data?.map((x) => {
          const chips = resumoFiltros(x.filtros, nomes);
          return (
            <li key={x.chave} className="flex flex-col rounded-[10px] border border-linha bg-papel p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-mono text-lg font-semibold tabular">{x.excede ? "100 mil+" : num(x.total)}<span className="ml-1 font-sans text-xs font-normal text-aco">empresas</span></p>
                <p className="text-xs text-aco">{quando(x.usado_em)}{x.vezes > 1 && ` · ${x.vezes}×`}</p>
              </div>
              <div className="mt-2 flex flex-1 flex-wrap content-start gap-1">
                {chips.map((c) => <span key={c} className="rounded-full bg-fundo px-2 py-0.5 text-xs">{c}</span>)}
              </div>
              {nomeando === x.chave ? (
                <form className="mt-3 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (nome.trim()) { salvar.mutate({ nome: nome.trim(), filtros: x.filtros }); setNomeando(null); } }}>
                  <Campo autoFocus className="h-8 text-[13px]" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da pesquisa" />
                  <Botao type="submit" tamanho="p" variante="primario">Salvar</Botao>
                </form>
              ) : (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Link href={`/app/pesquisa${qs(x.filtros)}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-acento px-3 text-[13px] font-medium text-white hover:opacity-90"><MagnifyingGlass size={13} /> Abrir</Link>
                  <Link href={`/app/pesquisa/graficos${qs(x.filtros)}`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linha px-3 text-[13px] hover:bg-acento-fundo"><ChartBar size={13} /> Gráficos</Link>
                  <Botao tamanho="p" onClick={() => { setNomeando(x.chave); setNome(chips.slice(0, 3).join(" · ")); }}><BookmarkSimple size={13} /> Salvar</Botao>
                  <Botao tamanho="p" variante="fantasma" aria-label="Apagar do histórico" onClick={() => apagar.mutate(x.chave)}><Trash size={13} /></Botao>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {h.data?.length === 0 && <Vazio titulo="Nenhuma pesquisa ainda" texto="As pesquisas de empresas que você fizer aparecem aqui." acao={<Link href="/app/pesquisa" className="text-sm font-medium text-acento underline">Fazer uma pesquisa</Link>} />}
    </div>
  );
}
