"use client";
/**
 * Um quadro: colunas renomeaveis, cartoes arrastaveis entre colunas e
 * dentro delas, e cada cartao abre com o mesmo editor de blocos das notas
 * (descricao, checklist, links), etiquetas, prazo e ligacao com um lead.
 */
import Link from "next/link";
import dynamic from "next/dynamic";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarBlank, CheckCircle, Circle, NotePencil, Plus, Trash } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { dataBr } from "@/lib/formato";
import { Kanban } from "@/componentes/app/Kanban";
import { AvisoErro, Botao, Campo, Esqueleto, Modal, Rotulo, Selecao, Selo } from "@/componentes/app/ui";

const EditorBlocos = dynamic(() => import("@/componentes/app/EditorBlocos"), { ssr: false, loading: () => <Esqueleto className="h-40" /> });
const CORES = ["slate", "sky", "violet", "amber", "orange", "emerald", "teal", "red"];

function NovoCartao({ aoCriar }: { aoCriar: (t: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [t, setT] = useState("");
  if (!aberto) return (
    <button type="button" onClick={() => setAberto(true)} className="flex w-full cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm text-aco hover:bg-papel hover:text-tinta">
      <Plus size={13} /> Adicionar cartão
    </button>
  );
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (t.trim()) { aoCriar(t.trim()); setT(""); } }}>
      <textarea autoFocus rows={2} value={t} onChange={(e) => setT(e.target.value)} placeholder="Título do cartão"
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (t.trim()) { aoCriar(t.trim()); setT(""); } } if (e.key === "Escape") setAberto(false); }}
        className="w-full resize-none rounded-lg border border-linha bg-papel p-2 text-sm outline-none focus:border-acento" />
      <div className="mt-1 flex gap-1.5">
        <Botao type="submit" tamanho="p" variante="primario">Adicionar</Botao>
        <Botao tamanho="p" variante="fantasma" onClick={() => setAberto(false)}>Cancelar</Botao>
      </div>
    </form>
  );
}

function TituloColuna({ coluna, aoSalvar, aoApagar }: { coluna: any; aoSalvar: (b: any) => void; aoApagar: () => void }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="relative">
      <button type="button" aria-label="Opções da coluna" onClick={() => setMenu(!menu)}
        className="cursor-pointer rounded px-1.5 text-aco hover:bg-linha">⋯</button>
      {menu && (
        <div className="absolute right-0 top-7 z-20 w-56 rounded-[10px] border border-linha bg-papel p-2 shadow-[var(--sombra-cartao)]">
          <Campo className="h-8 text-[13px]" defaultValue={coluna.titulo} aria-label="Nome da coluna"
            onKeyDown={(e) => { if (e.key === "Enter") { aoSalvar({ titulo: (e.target as HTMLInputElement).value }); setMenu(false); } }}
            onBlur={(e) => e.target.value !== coluna.titulo && aoSalvar({ titulo: e.target.value })} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CORES.map((c) => (
              <button key={c} type="button" aria-label={`Cor ${c}`} onClick={() => aoSalvar({ cor: c })}
                className={`h-5 w-5 cursor-pointer rounded-full ring-offset-2 ring-offset-papel ${{ slate: "bg-slate-400", sky: "bg-sky-500", violet: "bg-violet-500", amber: "bg-amber-500", orange: "bg-orange-500", emerald: "bg-emerald-500", teal: "bg-teal-500", red: "bg-red-500" }[c]} ${coluna.cor === c ? "ring-2 ring-tinta" : ""}`} />
            ))}
          </div>
          <button type="button" onClick={() => { setMenu(false); aoApagar(); }}
            className="mt-2 flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950">
            <Trash size={13} /> Apagar coluna vazia
          </button>
        </div>
      )}
    </div>
  );
}

function ModalCartao({ id, colunas, aoFechar }: { id: string | null; colunas: any[]; aoFechar: () => void }) {
  const qc = useQueryClient();
  const c = useQuery({ queryKey: ["cartao", id], queryFn: () => api(`/cartoes/${id}`), enabled: !!id });
  const leads = useQuery({ queryKey: ["leads"], queryFn: () => api<any[]>("/leads"), enabled: !!id });
  const [etq, setEtq] = useState("");
  const d: any = c.data;
  const salvar = useMutation({
    mutationFn: (b: Record<string, unknown>) => api(`/cartoes/${id}`, { method: "PATCH", json: b }),
    onSuccess: (r: any) => { qc.setQueryData(["cartao", id], r); qc.invalidateQueries({ queryKey: ["quadro"] }); },
  });
  const apagar = useMutation({
    mutationFn: () => api(`/cartoes/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quadro"] }); aoFechar(); },
  });

  return (
    <Modal aberto={!!id} aoFechar={aoFechar} largura="max-w-3xl"
      titulo={d ? (
        <input key={d.id} defaultValue={d.titulo} aria-label="Título do cartão"
          onBlur={(e) => e.target.value.trim() && e.target.value !== d.titulo && salvar.mutate({ titulo: e.target.value.trim() })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="w-full bg-transparent text-base font-semibold outline-none" />
      ) : "Cartão"}>
      {!d ? <div className="p-5"><Esqueleto className="h-48" /></div> : (
        <div key={d.id} className="grid gap-5 p-5 md:grid-cols-[1fr_220px]">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-1 text-xs text-aco"><NotePencil size={13} /> Descrição · digite / para blocos</p>
            <div className="min-h-[220px] rounded-lg border border-linha p-2 md:px-14">
              <EditorBlocos inicial={d.conteudo} aoMudar={(m) => salvar.mutate({ conteudo: m.conteudo })} />
            </div>
          </div>
          <aside className="space-y-4 text-sm">
            <button type="button" onClick={() => salvar.mutate({ concluido: !d.concluido })}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${d.concluido ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "border-linha hover:bg-acento-fundo"}`}>
              {d.concluido ? <CheckCircle size={16} weight="fill" /> : <Circle size={16} />} {d.concluido ? "Concluído" : "Marcar concluído"}
            </button>
            <div>
              <Rotulo>Coluna</Rotulo>
              <Selecao value={d.coluna_id} onChange={(e) => salvar.mutate({ coluna_id: e.target.value })}>
                {colunas.map((k) => <option key={k.id} value={k.id}>{k.titulo}</option>)}
              </Selecao>
            </div>
            <div>
              <Rotulo>Prazo</Rotulo>
              <Campo type="date" defaultValue={d.vence_em ?? ""} onChange={(e) => salvar.mutate({ vence_em: e.target.value || null })} />
            </div>
            <div>
              <Rotulo>Lead ligado</Rotulo>
              <Selecao value={d.lead_id ?? ""} onChange={(e) => salvar.mutate({ lead_id: e.target.value || null })}>
                <option value="">Nenhum</option>
                {(leads.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </Selecao>
              {d.lead_id && <Link href={`/app/leads?lead=${d.lead_id}`} className="mt-1 inline-block text-xs text-acento hover:underline dark:text-acento-claro">abrir lead</Link>}
            </div>
            <div>
              <Rotulo>Etiquetas</Rotulo>
              <div className="flex flex-wrap gap-1.5">
                {d.etiquetas.map((t: string) => (
                  <button key={t} type="button" className="cursor-pointer" onClick={() => salvar.mutate({ etiquetas: d.etiquetas.filter((x: string) => x !== t) })}>
                    <Selo tom="acento">{t} ×</Selo></button>
                ))}
              </div>
              <form className="mt-1.5" onSubmit={(e) => { e.preventDefault(); if (etq.trim()) { salvar.mutate({ etiquetas: [...d.etiquetas, etq.trim()] }); setEtq(""); } }}>
                <Campo className="h-8 text-[13px]" placeholder="+ etiqueta" value={etq} onChange={(e) => setEtq(e.target.value)} />
              </form>
            </div>
            <Botao variante="perigo" tamanho="p" onClick={() => { if (confirm("Apagar este cartão?")) apagar.mutate(); }}><Trash size={13} /> Apagar</Botao>
          </aside>
        </div>
      )}
    </Modal>
  );
}

export default function Quadro({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [aberto, setAberto] = useState<string | null>(null);
  const [novaColuna, setNovaColuna] = useState("");
  const q = useQuery({ queryKey: ["quadro", id], queryFn: () => api(`/quadros/${id}`) });
  const d: any = q.data;
  const recarregar = () => qc.invalidateQueries({ queryKey: ["quadro", id] });

  const mover = useMutation({
    mutationFn: ({ cid, coluna, posicao }: { cid: string; coluna: string; posicao: number }) =>
      api(`/cartoes/${cid}`, { method: "PATCH", json: { coluna_id: coluna, posicao } }),
    onSuccess: recarregar,
  });
  const criarCartao = useMutation({
    mutationFn: ({ coluna, titulo }: { coluna: string; titulo: string }) => api(`/quadros/${id}/cartoes`, { method: "POST", json: { coluna_id: coluna, titulo } }),
    onSuccess: recarregar,
  });
  const criarColuna = useMutation({
    mutationFn: (titulo: string) => api(`/quadros/${id}/colunas`, { method: "POST", json: { titulo } }),
    onSuccess: () => { setNovaColuna(""); recarregar(); },
  });
  const salvarColuna = useMutation({
    mutationFn: ({ cid, b }: { cid: string; b: any }) => api(`/colunas/${cid}`, { method: "PATCH", json: b }),
    onSuccess: recarregar,
  });
  const apagarColuna = useMutation({
    mutationFn: (cid: string) => api(`/colunas/${cid}`, { method: "DELETE" }),
    onSuccess: recarregar,
  });
  const renomear = useMutation({
    mutationFn: (titulo: string) => api(`/quadros/${id}`, { method: "PATCH", json: { titulo } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quadros"] }),
  });

  if (q.isLoading) return <div className="flex gap-3 p-8">{[0, 1, 2, 3].map((i) => <Esqueleto key={i} className="h-96 w-[290px]" />)}</div>;
  if (q.error) return <div className="p-8"><AvisoErro erro={q.error} /></div>;

  return (
    <div className="p-5 md:p-8">
      <Link href="/app/quadros" className="mb-2 inline-flex items-center gap-1 text-sm text-aco hover:text-tinta"><ArrowLeft size={14} /> Quadros</Link>
      <header className="flex items-center gap-2">
        <span className="text-2xl">{d.icone ?? "🗂️"}</span>
        <input defaultValue={d.titulo} aria-label="Nome do quadro"
          onBlur={(e) => e.target.value.trim() && e.target.value !== d.titulo && renomear.mutate(e.target.value.trim())}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-tight outline-none" />
      </header>
      {apagarColuna.error && <p className="mt-2 text-sm text-red-700">{(apagarColuna.error as any).message}</p>}

      <div className="mt-4">
        <Kanban
          colunas={d.colunas.map((c: any) => ({ id: c.id, titulo: c.titulo, cor: c.cor }))}
          itens={d.cartoes.map((c: any) => ({ ...c, coluna: c.coluna_id }))}
          aoMover={(cid, coluna, posicao) => mover.mutateAsync({ cid, coluna, posicao })}
          aoClicar={(c) => setAberto(c.id)}
          cabecalhoColuna={(c) => <TituloColuna coluna={d.colunas.find((x: any) => x.id === c.id)}
            aoSalvar={(b) => salvarColuna.mutate({ cid: c.id, b })} aoApagar={() => apagarColuna.mutate(c.id)} />}
          rodapeColuna={(c) => <NovoCartao aoCriar={(titulo) => criarCartao.mutate({ coluna: c.id, titulo })} />}
          renderCartao={(c: any) => (
            <div>
              <p className={`leading-snug ${c.concluido ? "text-aco line-through" : "font-medium"}`}>{c.titulo}</p>
              {(c.etiquetas?.length > 0 || c.vence_em || c.lead_nome || c.tem_conteudo) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-aco">
                  {c.etiquetas?.map((t: string) => <Selo key={t} tom="acento">{t}</Selo>)}
                  {c.vence_em && (
                    <span className={`inline-flex items-center gap-1 ${!c.concluido && c.vence_em < new Date().toISOString().slice(0, 10) ? "font-medium text-red-700 dark:text-red-300" : ""}`}>
                      <CalendarBlank size={12} /> {dataBr(c.vence_em).slice(0, 5)}
                    </span>
                  )}
                  {c.tem_conteudo && <NotePencil size={12} aria-label="tem descrição" />}
                  {c.lead_nome && <span className="truncate">· {c.lead_nome}</span>}
                </div>
              )}
            </div>
          )}
          depois={
            <form className="w-[260px] shrink-0" onSubmit={(e) => { e.preventDefault(); criarColuna.mutate(novaColuna.trim() || "Nova coluna"); }}>
              <Campo placeholder="+ Nova coluna" value={novaColuna} onChange={(e) => setNovaColuna(e.target.value)} className="bg-transparent" />
            </form>
          }
        />
      </div>

      <ModalCartao id={aberto} colunas={d.colunas} aoFechar={() => { setAberto(null); recarregar(); }} />
    </div>
  );
}
