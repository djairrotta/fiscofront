"use client";
/**
 * Kanban arrastavel generico (leads e quadros usam o mesmo).
 *
 * dnd-kit: mouse, toque e TECLADO (espaco pega, setas movem, espaco solta).
 * O estado local muda na hora (otimista); ao soltar, a posicao nova e o
 * meio entre os vizinhos e vai ao servidor num unico PATCH. Se o servidor
 * recusar, `aoMover` rejeita e o quadro volta ao que o servidor tem.
 */
import { useEffect, useMemo, useState } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, pointerWithin, useDroppable, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { posicaoEntre } from "@/lib/api";
import { COR_FASE } from "@/lib/formato";

/**
 * Onde o cartao vai cair. So `closestCorners` errava a coluna VAZIA: os
 * cantos de uma coluna alta ficam longe do ponteiro e o cartao da coluna
 * vizinha "ganhava" (visto no teste: soltar em Diagnostico gravava
 * Contatado). Primeiro vale o que esta SOB o ponteiro, cartao antes de
 * coluna; os cantos so desempatam quando o ponteiro esta no vao.
 */
const colisao: CollisionDetection = (args) => {
  const sob = pointerWithin(args);
  if (sob.length) {
    const cartoes = sob.filter((c) => !String(c.id).startsWith("col:"));
    return cartoes.length ? cartoes : sob;
  }
  return closestCorners(args);
};

export interface ColunaK { id: string; titulo: string; cor?: string }
export interface ItemK { id: string; coluna: string; posicao: number }

function Cartao<T extends ItemK>({ item, render, aoClicar }: { item: T; render: (i: T) => React.ReactNode; aoClicar?: (i: T) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, data: { tipo: "item" } });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => aoClicar?.(item)}
      className={`cursor-grab touch-manipulation rounded-lg border border-linha bg-papel p-3 text-sm shadow-[0_1px_2px_rgb(11_15_20/0.04)] transition-shadow hover:border-aco/40 active:cursor-grabbing ${isDragging ? "opacity-40" : ""}`}>
      {render(item)}
    </div>
  );
}

function Coluna({ coluna, ids, children, rodape, total, cabecalho }:
  { coluna: ColunaK; ids: string[]; children: React.ReactNode; rodape?: React.ReactNode; total?: React.ReactNode; cabecalho?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${coluna.id}`, data: { tipo: "coluna", coluna: coluna.id } });
  return (
    <section className={`flex w-[290px] shrink-0 flex-col rounded-[10px] border border-linha bg-fundo transition-colors ${isOver ? "border-acento/50 bg-acento-fundo/40" : ""}`}
      aria-label={coluna.titulo}>
      <header className="flex items-center justify-between gap-2 px-3 py-2.5">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span className={`h-2 w-2 shrink-0 rounded-full ${COR_FASE[coluna.cor ?? "slate"] ?? "bg-slate-400"}`} />
          <span className="truncate">{coluna.titulo}</span>
          <span className="font-mono text-xs font-normal tabular text-aco">{ids.length}</span>
        </h3>
        {cabecalho}
      </header>
      {total && <div className="px-3 pb-2 text-xs text-aco">{total}</div>}
      <div ref={setNodeRef} className="flex min-h-[80px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>{children}</SortableContext>
      </div>
      {rodape && <div className="border-t border-linha p-2">{rodape}</div>}
    </section>
  );
}

export function Kanban<T extends ItemK>({
  colunas, itens, renderCartao, aoMover, aoClicar, rodapeColuna, totalColuna, cabecalhoColuna, depois,
}: {
  colunas: ColunaK[];
  itens: T[];
  renderCartao: (i: T) => React.ReactNode;
  aoMover: (id: string, coluna: string, posicao: number) => Promise<unknown>;
  aoClicar?: (i: T) => void;
  rodapeColuna?: (c: ColunaK) => React.ReactNode;
  totalColuna?: (c: ColunaK, itens: T[]) => React.ReactNode;
  cabecalhoColuna?: (c: ColunaK) => React.ReactNode;
  depois?: React.ReactNode;
}) {
  const [local, setLocal] = useState<T[]>(itens);
  const [ativo, setAtivo] = useState<T | null>(null);
  useEffect(() => { if (!ativo) setLocal(itens); }, [itens, ativo]);

  const sensores = useSensors(
    // 6px antes de comecar a arrastar: clique simples continua abrindo o cartao.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const porColuna = useMemo(() => {
    const m = new Map<string, T[]>(colunas.map((c) => [c.id, []]));
    for (const i of [...local].sort((a, b) => a.posicao - b.posicao)) m.get(i.coluna)?.push(i);
    return m;
  }, [local, colunas]);

  const colunaDe = (id: string): string | null => {
    if (id.startsWith("col:")) return id.slice(4);
    return local.find((i) => i.id === id)?.coluna ?? null;
  };

  const inicio = (e: DragStartEvent) => setAtivo(local.find((i) => i.id === e.active.id) ?? null);

  // Ao passar sobre outra coluna, o cartao muda de coluna ja no estado local.
  const sobre = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const de = colunaDe(String(active.id)), para = colunaDe(String(over.id));
    if (!de || !para || de === para) return;
    setLocal((xs) => {
      const alvo = porColuna.get(para) ?? [];
      const idx = String(over.id).startsWith("col:") ? alvo.length : alvo.findIndex((i) => i.id === over.id);
      const antes = alvo[idx - 1]?.posicao ?? null;
      const prox = alvo[idx]?.posicao ?? null;
      return xs.map((i) => i.id === active.id ? { ...i, coluna: para, posicao: posicaoEntre(antes, prox) } : i);
    });
  };

  const fim = async (e: DragEndEvent) => {
    const { active, over } = e;
    const original = itens.find((i) => i.id === active.id);
    setAtivo(null);
    if (!over || !original) { setLocal(itens); return; }
    const para = colunaDe(String(over.id)) ?? original.coluna;
    const lista = (porColuna.get(para) ?? []).filter((i) => i.id !== active.id);
    let idx = String(over.id).startsWith("col:") ? lista.length : lista.findIndex((i) => i.id === over.id);
    if (idx < 0) idx = lista.length;
    // Arrastar para baixo dentro da mesma coluna: cai DEPOIS do alvo.
    const atualNaColuna = (porColuna.get(para) ?? []).findIndex((i) => i.id === active.id);
    const alvoNaColuna = (porColuna.get(para) ?? []).findIndex((i) => i.id === over.id);
    if (original.coluna === para && atualNaColuna >= 0 && alvoNaColuna > atualNaColuna) idx += 1;
    const nova = posicaoEntre(lista[idx - 1]?.posicao ?? null, lista[idx]?.posicao ?? null);
    if (para === original.coluna && Math.abs(nova - original.posicao) < 1e-9) { setLocal(itens); return; }
    setLocal((xs) => xs.map((i) => i.id === active.id ? { ...i, coluna: para, posicao: nova } : i));
    try { await aoMover(String(active.id), para, nova); } catch { setLocal(itens); }
  };

  return (
    <DndContext sensors={sensores} collisionDetection={colisao} onDragStart={inicio} onDragOver={sobre} onDragEnd={fim}
      onDragCancel={() => { setAtivo(null); setLocal(itens); }}
      accessibility={{
        screenReaderInstructions: { draggable: "Para mover, pressione espaço. Use as setas para escolher o lugar e espaço de novo para soltar. Esc cancela." },
      }}>
      <div className="flex min-h-[60vh] gap-3 overflow-x-auto pb-4">
        {colunas.map((c) => {
          const lista = porColuna.get(c.id) ?? [];
          return (
            <Coluna key={c.id} coluna={c} ids={lista.map((i) => i.id)} rodape={rodapeColuna?.(c)}
              total={totalColuna?.(c, lista)} cabecalho={cabecalhoColuna?.(c)}>
              {lista.map((i) => <Cartao key={i.id} item={i} render={renderCartao} aoClicar={aoClicar} />)}
            </Coluna>
          );
        })}
        {depois}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {ativo && (
          <div className="w-[274px] rotate-[1.5deg] cursor-grabbing rounded-lg border border-acento/40 bg-papel p-3 text-sm shadow-[var(--sombra-cartao)]">
            {renderCartao(ativo)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
