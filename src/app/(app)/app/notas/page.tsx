"use client";
/**
 * Notas estilo Notion: arvore de paginas a esquerda (pagina dentro de
 * pagina, favoritas no topo), editor de blocos a direita, salvamento
 * automatico. Uma nota pode estar ligada a um lead ou a uma empresa.
 */
import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CaretDown, CaretRight, DotsThree, FilePlus, MagnifyingGlass, Plus, Star, Trash, Buildings, Check, CircleNotch,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { cnpjMascara, dataBr } from "@/lib/formato";
import { Botao, Campo, Esqueleto, Vazio } from "@/componentes/app/ui";
import type { MudancaEditor } from "@/componentes/app/EditorBlocos";

const EditorBlocos = dynamic(() => import("@/componentes/app/EditorBlocos"), {
  ssr: false, loading: () => <Esqueleto className="h-64" />,
});

interface NotaMeta { id: string; pai_id: string | null; titulo: string; icone: string | null; favorita: boolean; posicao: number; cnpj: string | null; trecho?: string | null }
const ICONES = ["📄", "📌", "🧭", "⚖️", "💼", "📊", "🗂️", "✅", "💡", "📞", "🏛️", "🧾"];

function Arvore({ notas, pai, nivel, atual, abertas, alternar, abrir, criarFilha }:
  { notas: NotaMeta[]; pai: string | null; nivel: number; atual: string | null; abertas: Set<string>;
    alternar: (id: string) => void; abrir: (id: string) => void; criarFilha: (pai: string) => void }) {
  const filhas = notas.filter((n) => n.pai_id === pai).sort((a, b) => a.posicao - b.posicao);
  if (!filhas.length) return null;
  return (
    <ul>
      {filhas.map((n) => {
        const temFilhas = notas.some((x) => x.pai_id === n.id);
        const aberta = abertas.has(n.id);
        return (
          <li key={n.id}>
            <div className={`group flex items-center gap-0.5 rounded-md pr-1 text-sm ${atual === n.id ? "bg-acento-fundo font-medium" : "hover:bg-acento-fundo/50"}`}
              style={{ paddingLeft: 4 + nivel * 14 }}>
              <button type="button" aria-label={aberta ? "Recolher" : "Expandir"} onClick={() => alternar(n.id)}
                className={`cursor-pointer rounded p-0.5 text-aco hover:bg-linha ${temFilhas ? "" : "invisible"}`}>
                {aberta ? <CaretDown size={11} /> : <CaretRight size={11} />}
              </button>
              <button type="button" onClick={() => abrir(n.id)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 py-1.5 text-left">
                <span className="shrink-0">{n.icone ?? "📄"}</span>
                <span className="truncate">{n.titulo || "Sem título"}</span>
              </button>
              <button type="button" aria-label="Nova subpágina" onClick={() => criarFilha(n.id)}
                className="cursor-pointer rounded p-0.5 text-aco opacity-0 hover:bg-linha group-hover:opacity-100 focus:opacity-100"><Plus size={12} /></button>
            </div>
            {aberta && <Arvore notas={notas} pai={n.id} nivel={nivel + 1} atual={atual} abertas={abertas} alternar={alternar} abrir={abrir} criarFilha={criarFilha} />}
          </li>
        );
      })}
    </ul>
  );
}

function Pagina({ id, todas, aoApagar }: { id: string; todas: NotaMeta[]; aoApagar: () => void }) {
  const qc = useQueryClient();
  const n = useQuery({ queryKey: ["nota", id], queryFn: () => api(`/notas/${id}`) });
  const [estado, setEstado] = useState<"salvo" | "salvando" | "erro">("salvo");
  const [menuIcone, setMenuIcone] = useState(false);
  const d: any = n.data;

  const salvar = useMutation({
    mutationFn: (b: Record<string, unknown>) => api(`/notas/${id}`, { method: "PATCH", json: b }),
    onMutate: () => setEstado("salvando"),
    onSuccess: (r: any) => {
      setEstado("salvo");
      qc.setQueryData<NotaMeta[]>(["notas"], (xs) => xs?.map((x) => x.id === r.id ? { ...x, ...r } : x));
    },
    onError: () => setEstado("erro"),
  });

  // Caminho (breadcrumb) ate a raiz.
  const caminho = useMemo(() => {
    const c: NotaMeta[] = [];
    let atual = todas.find((x) => x.id === id);
    while (atual?.pai_id) { atual = todas.find((x) => x.id === atual!.pai_id); if (atual) c.unshift(atual); }
    return c;
  }, [todas, id]);

  if (n.isLoading) return <div className="space-y-4"><Esqueleto className="h-10 w-2/3" /><Esqueleto className="h-64" /></div>;
  if (!d) return <Vazio titulo="Página não encontrada" />;

  return (
    <article key={id} className="mx-auto max-w-[760px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 text-xs text-aco">
        <nav className="flex flex-wrap items-center gap-1">
          {caminho.map((c) => <span key={c.id} className="flex items-center gap-1"><Link href={`/app/notas?pagina=${c.id}`} className="hover:text-tinta">{c.icone ?? "📄"} {c.titulo || "Sem título"}</Link> /</span>)}
        </nav>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1" aria-live="polite">
            {estado === "salvando" ? <><CircleNotch size={12} className="animate-spin" /> salvando</> : estado === "erro" ? <span className="text-red-600">não salvou</span> : <><Check size={12} /> salvo</>}
          </span>
          <button type="button" onClick={() => salvar.mutate({ favorita: !d.favorita })} aria-pressed={d.favorita}
            className="inline-flex cursor-pointer items-center gap-1 hover:text-tinta">
            <Star size={14} weight={salvar.variables?.favorita ?? d.favorita ? "fill" : "regular"} /> favorita
          </button>
          <button type="button" onClick={() => { if (confirm("Apagar esta página e as subpáginas?")) aoApagar(); }}
            className="inline-flex cursor-pointer items-center gap-1 hover:text-red-600"><Trash size={14} /> apagar</button>
        </span>
      </div>

      <div className="relative">
        <button type="button" onClick={() => setMenuIcone(!menuIcone)} className="cursor-pointer rounded-lg p-1 text-4xl hover:bg-acento-fundo" aria-label="Trocar ícone">
          {d.icone ?? "📄"}
        </button>
        {menuIcone && (
          <div className="absolute left-0 top-14 z-10 grid grid-cols-6 gap-1 rounded-[10px] border border-linha bg-papel p-2 shadow-[var(--sombra-cartao)]">
            {ICONES.map((i) => (
              <button key={i} type="button" className="cursor-pointer rounded p-1 text-xl hover:bg-acento-fundo"
                onClick={() => { salvar.mutate({ icone: i }); qc.setQueryData(["nota", id], { ...d, icone: i }); setMenuIcone(false); }}>{i}</button>
            ))}
          </div>
        )}
      </div>

      <input
        defaultValue={d.titulo}
        placeholder="Sem título"
        aria-label="Título"
        onChange={(e) => {
          const v = e.target.value;
          qc.setQueryData<NotaMeta[]>(["notas"], (xs) => xs?.map((x) => x.id === id ? { ...x, titulo: v } : x));
        }}
        onBlur={(e) => e.target.value !== d.titulo && salvar.mutate({ titulo: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="mt-2 w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-aco/50 md:text-4xl"
      />

      {(d.cnpj || d.lead_nome) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {d.cnpj && <Link href={`/app/empresas/${d.cnpj}`} className="inline-flex items-center gap-1 rounded-full border border-linha px-2.5 py-1 text-aco hover:text-tinta"><Buildings size={12} /> {cnpjMascara(d.cnpj)}</Link>}
          {d.lead_nome && <Link href={`/app/leads?lead=${d.lead_id}`} className="inline-flex items-center gap-1 rounded-full border border-linha px-2.5 py-1 text-aco hover:text-tinta">Lead: {d.lead_nome}</Link>}
        </div>
      )}

      <p className="mt-2 text-xs text-aco">Digite <kbd className="rounded border border-linha px-1 font-mono">/</kbd> para inserir títulos, listas, tarefas, tabelas e citações · editada {dataBr(d.atualizado_em)}</p>

      <div className="mt-6 min-h-[50vh]">
        <EditorBlocos key={id} inicial={d.conteudo} aoMudar={(m: MudancaEditor) => salvar.mutate({ conteudo: m.conteudo, texto: m.texto })} />
      </div>
    </article>
  );
}

function Conteudo() {
  const qc = useQueryClient();
  const router = useRouter();
  const sp = useSearchParams();
  const atual = sp.get("pagina");
  const [busca, setBusca] = useState("");
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [lateralCelular, setLateralCelular] = useState(!atual);

  const notas = useQuery({ queryKey: ["notas"], queryFn: () => api<NotaMeta[]>("/notas") });
  const achadas = useQuery({ queryKey: ["notas", "busca", busca], queryFn: () => api<NotaMeta[]>(`/notas?q=${encodeURIComponent(busca)}`), enabled: busca.trim().length >= 2 });

  const abrir = (id: string | null) => { router.push(id ? `/app/notas?pagina=${id}` : "/app/notas", { scroll: false }); setLateralCelular(false); };

  // Abre os ancestrais da pagina atual na arvore.
  useEffect(() => {
    if (!atual || !notas.data) return;
    const s = new Set(abertas);
    let n = notas.data.find((x) => x.id === atual);
    while (n?.pai_id) { s.add(n.pai_id); n = notas.data.find((x) => x.id === n!.pai_id); }
    setAbertas(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual, notas.data?.length]);

  const criar = useMutation({
    mutationFn: (pai_id: string | null) => api("/notas", { method: "POST", json: { titulo: "", pai_id } }),
    onSuccess: (n: any) => {
      qc.setQueryData<NotaMeta[]>(["notas"], (xs) => [...(xs ?? []), n]);
      if (n.pai_id) setAbertas((s) => new Set(s).add(n.pai_id));
      abrir(n.id);
    },
  });
  const apagar = useMutation({
    mutationFn: (id: string) => api(`/notas/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notas"] }); abrir(null); },
  });

  const favoritas = (notas.data ?? []).filter((n) => n.favorita);

  return (
    <div className="flex min-h-[100dvh]">
      <aside className={`${lateralCelular ? "block" : "hidden"} w-full shrink-0 border-r border-linha bg-papel md:block md:w-64`}>
        <div className="sticky top-0 flex h-[100dvh] flex-col p-3">
          <div className="flex items-center justify-between px-1">
            <h1 className="text-sm font-semibold">Notas</h1>
            <button type="button" aria-label="Nova página" onClick={() => criar.mutate(null)}
              className="cursor-pointer rounded-md p-1.5 text-aco hover:bg-acento-fundo hover:text-tinta"><FilePlus size={16} /></button>
          </div>
          <div className="relative mt-2">
            <MagnifyingGlass size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-aco" />
            <Campo className="h-8 pl-7 text-[13px]" placeholder="Buscar nas notas" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {busca.trim().length >= 2 ? (
              <ul className="space-y-0.5">
                {(achadas.data ?? []).map((n) => (
                  <li key={n.id}><button type="button" onClick={() => abrir(n.id)} className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm hover:bg-acento-fundo/50">
                    {n.icone ?? "📄"} {n.titulo || "Sem título"}
                    {n.trecho && <span className="mt-0.5 block truncate text-xs text-aco">{n.trecho}</span>}
                  </button></li>
                ))}
                {achadas.data?.length === 0 && <li className="px-2 text-xs text-aco">Nada encontrado.</li>}
              </ul>
            ) : notas.isLoading ? <Esqueleto className="h-40" /> : (
              <>
                {favoritas.length > 0 && (
                  <>
                    <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-aco">Favoritas</p>
                    <ul className="mb-3">
                      {favoritas.map((n) => (
                        <li key={n.id}><button type="button" onClick={() => abrir(n.id)}
                          className={`flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm ${atual === n.id ? "bg-acento-fundo font-medium" : "hover:bg-acento-fundo/50"}`}>
                          <span>{n.icone ?? "📄"}</span><span className="truncate">{n.titulo || "Sem título"}</span></button></li>
                      ))}
                    </ul>
                    <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-aco">Páginas</p>
                  </>
                )}
                <Arvore notas={notas.data ?? []} pai={null} nivel={0} atual={atual} abertas={abertas}
                  alternar={(id) => setAbertas((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                  abrir={abrir} criarFilha={(pai) => criar.mutate(pai)} />
                {notas.data?.length === 0 && <p className="px-2 text-sm text-aco">Nenhuma página ainda.</p>}
              </>
            )}
          </div>
          <Botao tamanho="p" className="mt-2" onClick={() => criar.mutate(null)}><Plus size={13} /> Nova página</Botao>
        </div>
      </aside>

      <section className={`${lateralCelular ? "hidden" : "block"} min-w-0 flex-1 px-5 py-6 md:block md:px-12 md:py-10`}>
        <button type="button" onClick={() => setLateralCelular(true)} className="mb-4 inline-flex cursor-pointer items-center gap-1 text-sm text-aco md:hidden">
          <DotsThree size={16} /> Páginas
        </button>
        {atual ? (
          <Pagina id={atual} todas={notas.data ?? []} aoApagar={() => apagar.mutate(atual)} />
        ) : (
          <div className="mx-auto mt-[12vh] max-w-md">
            <Vazio titulo="Suas anotações, do jeito do Notion"
              texto="Crie páginas para estratégia, roteiro de ligação, pauta de reunião, checklist de documentos. Páginas podem ter subpáginas, e cada uma pode ser ligada a uma empresa."
              acao={<Botao variante="primario" onClick={() => criar.mutate(null)}><Plus size={14} /> Criar a primeira página</Botao>} />
          </div>
        )}
      </section>
    </div>
  );
}

export default function Notas() {
  return <Suspense><Conteudo /></Suspense>;
}
