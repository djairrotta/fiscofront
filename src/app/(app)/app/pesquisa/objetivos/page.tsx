"use client";
/**
 * Objetivos: o usuário conta o que quer (o que vende, para quem, onde) e a
 * IA propõe três pesquisas complementares, cada uma com o porquê. O perfil
 * comercial do escritório fica salvo e também alimenta as mensagens.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChartBar, MagnifyingGlass, Sparkle, Target } from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { num } from "@/lib/formato";
import { resumoFiltros } from "@/lib/busca";
import { AvisoErro, Botao, Campo, Rotulo, Superficie } from "@/componentes/app/ui";

const EXEMPLOS = [
  "Sou contador em Campinas e quero empresas novas da região que ainda não têm contabilidade",
  "Escritório de consultoria tributária: empresas de SP que perderam o Simples ou tiveram o parcelamento rescindido",
  "Quero clientes de BPO financeiro: empresas pequenas de serviços em Belo Horizonte com e-mail",
];

function Contagem({ filtros }: { filtros: Record<string, string> }) {
  const c = useQuery({ queryKey: ["busca-previa", filtros], queryFn: () => api<any>(`/busca/contagem${qs(filtros)}`), staleTime: 60_000 });
  return <span className="font-mono tabular">{c.data ? (c.data.excede ? "100 mil+" : num(c.data.total)) : "…"}</span>;
}

export default function Objetivos() {
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  const perfil = useQuery({ queryKey: ["perfil-comercial"], queryFn: () => api<any>("/perfil-comercial") });
  const [p, setP] = useState({ oferta: "", publico: "", regiao: "", assinatura: "", site: "" });
  useEffect(() => { if (perfil.data) setP({ oferta: "", publico: "", regiao: "", assinatura: "", site: "", ...Object.fromEntries(Object.entries(perfil.data).filter(([, v]) => v != null)) }); }, [perfil.data]);
  const salvarPerfil = useMutation({ mutationFn: () => api("/perfil-comercial", { method: "PUT", json: p }), onSuccess: () => qc.invalidateQueries({ queryKey: ["perfil-comercial"] }) });
  const obj = useMutation({ mutationFn: () => api<any>("/ia/objetivo", { method: "POST", json: { texto } }) });

  return (
    <div className="mx-auto max-w-[1100px] p-5 md:p-8">
      <Link href="/app/pesquisa" className="inline-flex items-center gap-1 text-sm text-aco hover:text-tinta"><ArrowLeft size={14} /> Pesquisa de empresas</Link>
      <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold tracking-tight"><Target size={20} /> Objetivos</h1>
      <p className="mt-0.5 text-sm text-aco">Conte o que você quer conquistar. A IA monta as pesquisas; você confere e ajusta.</p>

      <form className="mt-5" onSubmit={(e) => { e.preventDefault(); if (texto.trim().length >= 8) obj.mutate(); }}>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3}
          placeholder="Ex.: sou contador em Ribeirão Preto e quero empresas de comércio que abriram nos últimos 6 meses"
          className="w-full rounded-[10px] border border-linha bg-papel px-3 py-2.5 text-sm outline-none focus:border-acento" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Botao type="submit" variante="primario" disabled={obj.isPending || texto.trim().length < 8}><Sparkle size={14} /> {obj.isPending ? "Montando pesquisas…" : "Montar pesquisas"}</Botao>
          {EXEMPLOS.map((x) => <button key={x} type="button" onClick={() => setTexto(x)} className="cursor-pointer rounded-full border border-linha px-2.5 py-1 text-xs text-aco hover:border-acento">{x.slice(0, 48)}…</button>)}
        </div>
      </form>
      <AvisoErro erro={obj.error} />

      {obj.data && (
        <ul className="mt-5 grid gap-3 md:grid-cols-3">
          {obj.data.pesquisas.map((x: any, i: number) => (
            <li key={i} className="flex flex-col rounded-[10px] border border-linha bg-papel p-4">
              <p className="font-semibold">{x.titulo}</p>
              <p className="mt-1 text-sm text-aco">{x.porque}</p>
              <div className="mt-2 flex flex-1 flex-wrap content-start gap-1">{resumoFiltros(x.filtros).map((c) => <span key={c} className="rounded-full bg-fundo px-2 py-0.5 text-xs">{c}</span>)}</div>
              {x.avisos?.length > 0 && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{x.avisos.join(" ")}</p>}
              <p className="mt-3 text-sm"><Contagem filtros={x.filtros} /> empresas</p>
              <div className="mt-2 flex gap-1.5">
                <Link href={`/app/pesquisa${qs(x.filtros)}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-acento px-3 text-[13px] font-medium text-white hover:opacity-90"><MagnifyingGlass size={13} /> Abrir</Link>
                <Link href={`/app/pesquisa/graficos${qs(x.filtros)}`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linha px-3 text-[13px] hover:bg-acento-fundo"><ChartBar size={13} /> Gráficos</Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Superficie titulo="Perfil do seu escritório" className="mt-8">
        <form className="grid gap-3 p-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); salvarPerfil.mutate(); }}>
          <div className="md:col-span-2"><Rotulo>O que você oferece</Rotulo><Campo value={p.oferta} onChange={(e) => setP({ ...p, oferta: e.target.value })} placeholder="Contabilidade completa para pequenas empresas, abertura de empresa, regularização fiscal" /></div>
          <div><Rotulo>Para quem</Rotulo><Campo value={p.publico} onChange={(e) => setP({ ...p, publico: e.target.value })} placeholder="Comércio e serviços, ME e EPP" /></div>
          <div><Rotulo>Onde atende</Rotulo><Campo value={p.regiao} onChange={(e) => setP({ ...p, regiao: e.target.value })} placeholder="Campinas e região" /></div>
          <div><Rotulo>Assinatura das mensagens</Rotulo><Campo value={p.assinatura} onChange={(e) => setP({ ...p, assinatura: e.target.value })} placeholder="Ana Souza · Souza Contabilidade · (19) 99999-0000" /></div>
          <div><Rotulo>Site</Rotulo><Campo value={p.site} onChange={(e) => setP({ ...p, site: e.target.value })} placeholder="souzacontabil.com.br" /></div>
          <div className="md:col-span-2"><Botao type="submit" disabled={salvarPerfil.isPending}>{salvarPerfil.isSuccess ? "Salvo" : "Salvar perfil"}</Botao>
            <span className="ml-2 text-xs text-aco">Usado pela IA nos objetivos e nas mensagens de primeiro contato.</span></div>
        </form>
      </Superficie>
    </div>
  );
}
