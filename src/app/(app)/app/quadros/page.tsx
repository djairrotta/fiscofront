"use client";
/** Quadros kanban de planejamento: lista e criacao. */
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Columns, Plus } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { num } from "@/lib/formato";
import { AvisoErro, Botao, Campo, Esqueleto, Vazio } from "@/componentes/app/ui";

const MODELOS = [
  { titulo: "Planejamento da semana", icone: "🗓️" },
  { titulo: "Prospecção da cidade", icone: "🏙️" },
  { titulo: "Ações em andamento", icone: "⚖️" },
];

export default function Quadros() {
  const qc = useQueryClient();
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const q = useQuery({ queryKey: ["quadros"], queryFn: () => api<any[]>("/quadros") });
  const criar = useMutation({
    mutationFn: (b: { titulo: string; icone?: string }) => api("/quadros", { method: "POST", json: b }),
    onSuccess: (b: any) => { qc.invalidateQueries({ queryKey: ["quadros"] }); router.push(`/app/quadros/${b.id}`); },
  });

  return (
    <div className="mx-auto max-w-[1100px] p-5 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Quadros</h1>
          <p className="mt-0.5 text-sm text-aco">Kanban livre para planejar, distribuir tarefas e acompanhar o que está andando.</p>
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); criar.mutate({ titulo: titulo.trim() || "Novo quadro" }); }}>
          <Campo className="w-56" placeholder="Nome do quadro" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <Botao type="submit" variante="primario" disabled={criar.isPending}><Plus size={14} /> Criar</Botao>
        </form>
      </header>
      <div className="mt-4"><AvisoErro erro={q.error} /></div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {q.isLoading && [0, 1, 2].map((i) => <Esqueleto key={i} className="h-28" />)}
        {q.data?.map((b) => (
          <Link key={b.id} href={`/app/quadros/${b.id}`}
            className="group rounded-[10px] border border-linha bg-papel p-4 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-aco/40">
            <p className="text-2xl">{b.icone ?? "🗂️"}</p>
            <p className="mt-2 font-semibold">{b.titulo}</p>
            <p className="mt-1 text-xs text-aco">{num(b.cartoes)} cartões · {num(b.concluidos)} concluídos</p>
            {Number(b.cartoes) > 0 && (
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-linha">
                <div className="h-full rounded-full bg-grafico" style={{ width: `${(100 * Number(b.concluidos)) / Number(b.cartoes)}%` }} />
              </div>
            )}
          </Link>
        ))}
      </div>

      {q.data?.length === 0 && (
        <div className="mt-2">
          <Vazio titulo="Nenhum quadro ainda" texto="Comece com um modelo. Cada quadro nasce com as colunas A fazer, Fazendo, Aguardando e Feito; dá para renomear e criar outras."
            acao={<div className="flex flex-wrap justify-center gap-2">{MODELOS.map((m) => (
              <Botao key={m.titulo} onClick={() => criar.mutate(m)}><Columns size={14} /> {m.icone} {m.titulo}</Botao>
            ))}</div>} />
        </div>
      )}
    </div>
  );
}
