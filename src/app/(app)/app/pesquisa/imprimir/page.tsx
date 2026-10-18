"use client";
/**
 * Versão para imprimir / salvar em PDF da pesquisa (até 1.000 empresas):
 * tabela compacta em paisagem, cabeçalho com os filtros e a data.
 * O navegador gera o PDF (Imprimir → Salvar como PDF).
 */
import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { brl, cnpjMascara, dataBr, telefoneFmt } from "@/lib/formato";
import { resumoFiltros } from "@/lib/busca";
import { Botao, Esqueleto } from "@/componentes/app/ui";

const fmt = (c: string, v: any) => {
  if (v == null || v === "") return "";
  if (c === "cnpj") return cnpjMascara(v);
  if (["capital_social", "divida_total", "divida_ajuizada"].includes(c)) return brl(Number(v));
  if (/^data_|abertura|inscricao_antiga/.test(c)) return dataBr(v);
  if (c.startsWith("telefone")) return telefoneFmt(v);
  return String(v);
};

function Conteudo() {
  const sp = useSearchParams();
  const filtros = useMemo(() => Object.fromEntries([...sp.entries()].filter(([, v]) => v)), [sp]);
  const r = useQuery({ queryKey: ["busca-imprimir", filtros], queryFn: () => api<any>(`/busca/exportar${qs({ ...filtros, formato: "json" })}`) });
  useEffect(() => { if (r.data) setTimeout(() => window.print(), 400); }, [r.data]);
  const resumo = resumoFiltros(Object.fromEntries(Object.entries(filtros).filter(([k]) => !["colunas", "max"].includes(k))));

  return (
    <div className="bg-papel p-6 print:p-0">
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm } nav, aside, header.app { display: none !important } }`}</style>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Pesquisa de empresas</h1>
          <p className="text-xs text-aco">{resumo.join(" · ")}</p>
          <p className="text-xs text-aco">Gerado em {new Date().toLocaleString("pt-BR")} · fonte: Receita Federal e PGFN (dados públicos)</p>
        </div>
        <Botao tamanho="p" className="print:hidden" onClick={() => window.print()}><Printer size={14} /> Imprimir / PDF</Botao>
      </div>
      {r.isLoading ? <Esqueleto className="h-96" /> : (
        <table className="w-full border-collapse text-[10px] leading-tight">
          <thead>
            <tr>{r.data?.colunas.map((c: any) => <th key={c.id} className="border-b-2 border-tinta px-1 py-1 text-left font-semibold">{c.rotulo}</th>)}</tr>
          </thead>
          <tbody>
            {r.data?.linhas.map((l: any, i: number) => (
              <tr key={i} className="break-inside-avoid border-b border-linha">
                {r.data.colunas.map((c: any) => <td key={c.id} className="px-1 py-0.5 align-top">{fmt(c.id, l[c.id])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {r.data && <p className="mt-2 text-xs text-aco">{r.data.linhas.length} empresas</p>}
    </div>
  );
}

export default function Imprimir() {
  return <Suspense><Conteudo /></Suspense>;
}
