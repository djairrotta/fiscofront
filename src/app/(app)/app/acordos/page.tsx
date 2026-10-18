"use client";
/**
 * Acordos e parcelamentos: transacao e parcelamento da PGFN, da PGE-SP e
 * da AGE-MG, com o que esta aberto agora, ate quando, e as condicoes. Cada
 * programa leva a fonte e a data em que foi conferido: edital muda.
 */
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowSquareOut, CalendarBlank, MagnifyingGlass } from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { dataBr } from "@/lib/formato";
import { AvisoErro, Esqueleto, Selo } from "@/componentes/app/ui";

const ORGAOS: Record<string, string> = { PGFN: "União (PGFN)", PGE_SP: "São Paulo (PGE-SP)", AGE_MG: "Minas Gerais (AGE-MG)" };
const ESTADO: Record<string, { r: string; tom: "ok" | "alerta" | "neutro" | "acento" }> = {
  aberto: { r: "Adesão aberta", tom: "ok" }, permanente: { r: "Permanente", tom: "acento" },
  em_breve: { r: "Abre em breve", tom: "alerta" }, encerrado: { r: "Encerrado", tom: "neutro" },
};
const TIPO: Record<string, string> = { transacao_adesao: "Transação por adesão", transacao_individual: "Transação individual", parcelamento: "Parcelamento" };
/** Atalho para a pesquisa com as devedoras que esse programa provavelmente alcanca. */
const FILTRO: Record<string, Record<string, string>> = {
  "pgfn-6-2026-pequeno-valor": { programa: "pequeno_valor" },
  "pgfn-6-2026-dificil": { programa: "dificil" },
  "pgfn-12-2026-fgts": { programa: "fgts" },
  "pgfn-individual": { programa: "individual" },
  "pgfn-9-2026-mei": { regime: "mei", valor_max: "20000" },
  "pgfn-mei-pequeno-valor": { regime: "mei", valor_max: "8105" },
  "sp-acordo-paulista-1-2025": { estadual: "sp" },
  "sp-transacao-individual": { estadual: "sp" },
};

export default function Acordos() {
  const q = useQuery({ queryKey: ["programas"], queryFn: () => api<any[]>("/programas") });
  const [orgao, setOrgao] = useState<string>("");
  const [verEncerrados, setVerEncerrados] = useState(false);
  const lista = (q.data ?? []).filter((p) => (!orgao || p.orgao === orgao) && (verEncerrados || p.estado !== "encerrado"));
  const abertos = (q.data ?? []).filter((p) => p.estado === "aberto");
  const proximo = [...abertos].sort((a, b) => a.dias - b.dias)[0];

  return (
    <div className="mx-auto max-w-[1100px] p-5 md:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Acordos e parcelamentos</h1>
      <p className="mt-0.5 max-w-[70ch] text-sm text-aco">
        Transação e parcelamento de dívida ativa na União, em São Paulo e em Minas Gerais: o que está aberto, até quando e em que condições.
        Na ficha de cada empresa, o sistema já indica quais destes programas cabem para ela.
      </p>

      {proximo && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <CalendarBlank size={18} className="shrink-0" />
          <span><b>{abertos.length} programas com adesão aberta.</b> O primeiro prazo a vencer termina em {dataBr(proximo.adesao_fim)}, daqui a {proximo.dias} dias.</span>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {[["", "Todos"], ...Object.entries(ORGAOS)].map(([k, r]) => (
          <button key={k} type="button" onClick={() => setOrgao(k)} aria-pressed={orgao === k}
            className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${orgao === k ? "border-acento bg-acento text-white" : "border-linha bg-papel text-aco hover:border-acento"}`}>{r}</button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-sm text-aco">
          <input type="checkbox" checked={verEncerrados} onChange={(e) => setVerEncerrados(e.target.checked)} /> mostrar encerrados
        </label>
      </div>

      <div className="mt-4"><AvisoErro erro={q.error} /></div>
      {q.isLoading && <Esqueleto className="mt-4 h-64" />}

      <div className="mt-4 space-y-3">
        {lista.map((p) => {
          const est = ESTADO[p.estado] ?? ESTADO.permanente;
          const filtro = FILTRO[p.slug];
          return (
            <article key={p.slug} className={`rounded-[10px] border border-linha bg-papel p-5 ${p.estado === "encerrado" ? "opacity-70" : ""}`}>
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-aco">{ORGAOS[p.orgao]} · {TIPO[p.tipo] ?? p.tipo}</p>
                  <h2 className="mt-0.5 font-semibold">{p.nome}</h2>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Selo tom={est.tom}>{est.r}</Selo>
                  {p.adesao_fim && <span className="text-xs text-aco">
                    {p.estado === "aberto" ? `até ${dataBr(p.adesao_fim)} · ${p.dias} dias` : p.estado === "encerrado" ? `encerrou em ${dataBr(p.adesao_fim)}` : `de ${dataBr(p.adesao_inicio)} a ${dataBr(p.adesao_fim)}`}
                  </span>}
                </div>
              </header>

              <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                {[["Quem pode", p.publico], ["Débitos", p.debitos], ["Desconto", p.desconto], ["Entrada", p.entrada], ["Parcelas", p.parcelas]]
                  .filter(([, v]) => v).map(([r, v]) => (
                    <div key={r as string} className={r === "Desconto" || r === "Quem pode" ? "md:col-span-2" : ""}>
                      <dt className="text-xs font-medium text-aco">{r}</dt><dd className="mt-0.5 leading-relaxed">{v}</dd>
                    </div>
                  ))}
              </dl>
              {p.observacoes && <p className="mt-3 rounded-lg bg-fundo px-3 py-2 text-[13px] leading-relaxed text-aco">{p.observacoes}</p>}

              <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-linha pt-3 text-xs text-aco">
                <span>{p.base_legal} · conferido em {dataBr(p.verificado_em)}</span>
                <span className="flex flex-wrap gap-3">
                  {filtro && p.estado !== "encerrado" && (
                    <Link href={`/app/devedores${qs(filtro)}`} className="inline-flex items-center gap-1 font-medium text-acento hover:underline dark:text-acento-claro">
                      <MagnifyingGlass size={12} /> Empresas que podem caber
                    </Link>
                  )}
                  {p.onde_aderir && <a href={p.onde_aderir} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-tinta">Onde aderir <ArrowSquareOut size={12} /></a>}
                  {p.fonte_url && <a href={p.fonte_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-tinta">Fonte <ArrowSquareOut size={12} /></a>}
                </span>
              </footer>
            </article>
          );
        })}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-aco">
        Resumo para triagem. O edital e o ato normativo publicados prevalecem: confirme prazos e condições na fonte oficial antes de orientar o cliente.
      </p>
    </div>
  );
}
