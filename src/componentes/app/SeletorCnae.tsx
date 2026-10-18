"use client";
/**
 * Atividades (CNAE): digita o ramo ("padaria", "contabilidade") ou o código
 * (inteiro ou só o começo, "47" = todo o varejo), escolhe, vira etiqueta.
 * O valor é a lista de códigos/prefixos separados por vírgula (URL).
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";

interface Cnae { codigo: string; descricao: string; secao?: string; prefixo?: boolean }
const fmt = (c: string) => (c.length === 7 ? `${c.slice(0, 4)}-${c.slice(4, 5)}/${c.slice(5)}` : `${c}…`);

export function SeletorCnae({ valor, aoMudar }: { valor: string; aoMudar: (v: string) => void }) {
  const ids = valor ? valor.split(",").filter(Boolean) : [];
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);

  const rotulos = useQuery({
    queryKey: ["cnae-ids", valor], enabled: ids.length > 0, staleTime: Infinity,
    queryFn: () => api<Cnae[]>(`/busca/cnaes${qs({ ids: valor })}`),
  });
  const busca = useQuery({
    queryKey: ["cnaes", texto], enabled: texto.trim().length >= 2, staleTime: 3600_000,
    queryFn: () => api<Cnae[]>(`/busca/cnaes${qs({ q: texto })}`),
  });
  const digitos = texto.replace(/\D/g, "");
  const opcoes: Cnae[] = [
    ...(digitos.length >= 2 && digitos.length < 7 && !ids.includes(digitos)
      ? [{ codigo: digitos, descricao: `Todas as atividades que começam com ${digitos}`, prefixo: true }] : []),
    ...(busca.data ?? []).filter((c) => !ids.includes(c.codigo)),
  ];

  useEffect(() => {
    const f = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);

  const escolher = (c: Cnae) => { aoMudar([...ids, c.codigo].join(",")); setTexto(""); setAtivo(0); };
  const tirar = (id: string) => aoMudar(ids.filter((x) => x !== id).join(","));

  return (
    <div ref={caixa} className="relative">
      <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-lg border border-linha bg-papel px-1.5 py-1 focus-within:border-acento">
        {ids.map((id) => {
          const r = rotulos.data?.find((x) => x.codigo === id);
          return (
            <span key={id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-acento-fundo px-2 py-0.5 text-xs" title={r?.descricao}>
              <span className="font-mono tabular">{fmt(id)}</span>
              {r && <span className="truncate">{r.descricao}</span>}
              <button type="button" aria-label={`Tirar ${id}`} onClick={() => tirar(id)} className="cursor-pointer text-aco hover:text-tinta"><X size={10} /></button>
            </span>
          );
        })}
        <input value={texto} aria-label="Atividade (CNAE)"
          onChange={(e) => { setTexto(e.target.value); setAberto(true); setAtivo(0); }}
          onFocus={() => setAberto(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((a) => Math.min(a + 1, opcoes.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter" && opcoes[ativo]) { e.preventDefault(); escolher(opcoes[ativo]); }
            if (e.key === "Backspace" && !texto && ids.length) tirar(ids[ids.length - 1]);
          }}
          placeholder={ids.length ? "" : "Ramo ou código: padaria, 6920, 47…"}
          className="h-6 min-w-[120px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-aco/70" />
      </div>
      {aberto && texto.trim().length >= 2 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-[10px] border border-linha bg-papel py-1 shadow-[var(--sombra-cartao)]" role="listbox">
          {opcoes.map((c, i) => (
            <li key={c.codigo + (c.prefixo ? "p" : "")} role="option" aria-selected={i === ativo}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); escolher(c); }}
                className={`flex w-full cursor-pointer gap-2 px-3 py-1.5 text-left text-sm ${i === ativo ? "bg-acento-fundo" : "hover:bg-acento-fundo/50"}`}>
                <span className="shrink-0 font-mono text-xs tabular text-aco">{fmt(c.codigo)}</span><span>{c.descricao}</span>
              </button>
            </li>
          ))}
          {busca.isFetched && opcoes.length === 0 && <li className="px-3 py-1.5 text-sm text-aco">Nenhuma atividade encontrada</li>}
        </ul>
      )}
    </div>
  );
}
