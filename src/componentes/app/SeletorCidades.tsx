"use client";
/**
 * Uma ou varias cidades. Digita, escolhe, vira etiqueta. O valor e a lista
 * de codigos IBGE separados por virgula (o mesmo formato da URL).
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";

interface Mun { ibge: string; nome: string; uf: string }

export function SeletorCidades({ valor, aoMudar, ufs }: { valor: string; aoMudar: (v: string) => void; ufs: string[] }) {
  const ids = valor ? valor.split(",").filter(Boolean) : [];
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);

  const nomes = useQuery({
    queryKey: ["municipios-ids", valor],
    queryFn: () => api<Mun[]>(`/municipios${qs({ ids: valor })}`),
    enabled: ids.length > 0, staleTime: Infinity,
  });
  const busca = useQuery({
    queryKey: ["municipios", texto, ufs.length === 1 ? ufs[0] : ""],
    queryFn: () => api<Mun[]>(`/municipios${qs({ q: texto, uf: ufs.length === 1 ? ufs[0] : "" })}`),
    enabled: texto.trim().length >= 2, staleTime: 3600_000,
  });
  const opcoes = (busca.data ?? []).filter((m) => !ids.includes(m.ibge) && (ufs.length <= 1 || ufs.includes(m.uf)));

  useEffect(() => {
    const f = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);

  const escolher = (m: Mun) => { aoMudar([...ids, m.ibge].join(",")); setTexto(""); setAtivo(0); };
  const tirar = (id: string) => aoMudar(ids.filter((x) => x !== id).join(","));

  return (
    <div ref={caixa} className="relative">
      <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-lg border border-linha bg-papel px-1.5 py-1 focus-within:border-acento">
        {ids.map((id) => {
          const m = nomes.data?.find((x) => x.ibge === id);
          return (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-acento-fundo px-2 py-0.5 text-xs">
              {m ? `${m.nome}/${m.uf}` : id}
              <button type="button" aria-label={`Tirar ${m?.nome ?? id}`} onClick={() => tirar(id)} className="cursor-pointer text-aco hover:text-tinta"><X size={10} /></button>
            </span>
          );
        })}
        <input
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setAberto(true); setAtivo(0); }}
          onFocus={() => setAberto(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((a) => Math.min(a + 1, opcoes.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter" && opcoes[ativo]) { e.preventDefault(); escolher(opcoes[ativo]); }
            if (e.key === "Backspace" && !texto && ids.length) tirar(ids[ids.length - 1]);
          }}
          placeholder={ids.length ? "" : "Digite o nome da cidade"}
          aria-label="Cidades"
          className="h-6 min-w-[90px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-aco/70"
        />
      </div>
      {aberto && texto.trim().length >= 2 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-[10px] border border-linha bg-papel py-1 shadow-[var(--sombra-cartao)]" role="listbox">
          {opcoes.map((m, i) => (
            <li key={m.ibge} role="option" aria-selected={i === ativo}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); escolher(m); }}
                className={`flex w-full cursor-pointer justify-between px-3 py-1.5 text-left text-sm ${i === ativo ? "bg-acento-fundo" : "hover:bg-acento-fundo/50"}`}>
                <span>{m.nome}</span><span className="text-xs text-aco">{m.uf}</span>
              </button>
            </li>
          ))}
          {busca.isFetched && opcoes.length === 0 && <li className="px-3 py-1.5 text-sm text-aco">Nenhuma cidade com esse nome</li>}
        </ul>
      )}
    </div>
  );
}
