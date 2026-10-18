"use client";
/**
 * Exportar a pesquisa: escolher formato (planilha, CSV ou PDF para
 * imprimir), quantas linhas (até 100 mil) e quais colunas. Modelos
 * prontos para os usos mais comuns (ligar, mandar e-mail, cadastro).
 */
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, DownloadSimple, FileCsv, FileXls, Printer } from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { num } from "@/lib/formato";
import { resumoFiltros } from "@/lib/busca";
import { useNomesCidades } from "@/lib/useCidades";
import { Campo, Esqueleto, Rotulo, Superficie } from "@/componentes/app/ui";

const MODELOS: Record<string, { rotulo: string; colunas: string[] }> = {
  ligar: { rotulo: "Para ligar", colunas: ["cnpj", "razao_social", "nome_fantasia", "municipio", "uf", "telefone", "telefone2", "socios", "cnae_descricao", "contador"] },
  email: { rotulo: "Para e-mail", colunas: ["cnpj", "razao_social", "nome_fantasia", "email", "municipio", "uf", "cnae_descricao", "contador"] },
  divida: { rotulo: "Dívida federal", colunas: ["cnpj", "razao_social", "municipio", "uf", "regime", "divida_total", "divida_ajuizada", "inscricoes", "tributo", "acordo", "telefone", "email"] },
};

function Conteudo() {
  const sp = useSearchParams();
  const filtros = useMemo(() => Object.fromEntries([...sp.entries()].filter(([k, v]) => v && k !== "pagina")), [sp]);
  const cidades = useNomesCidades(filtros.municipio);
  const cols = useQuery({ queryKey: ["busca-colunas"], queryFn: () => api<any[]>("/busca/colunas"), staleTime: Infinity });
  const cont = useQuery({ queryKey: ["busca-previa", filtros], queryFn: () => api<any>(`/busca/contagem${qs(filtros)}`) });
  const [sel, setSel] = useState<string[]>([]);
  const [formato, setFormato] = useState<"xlsx" | "csv" | "pdf">("xlsx");
  const [max, setMax] = useState("");
  useEffect(() => { if (cols.data && !sel.length) setSel(cols.data.filter((c) => c.padrao).map((c) => c.id)); }, [cols.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = cont.data?.total ?? 0;
  const linhas = Math.min(Number(max) || total, total, formato === "pdf" ? 1000 : 100_000);
  const grupos = new Map<string, any[]>();
  for (const c of cols.data ?? []) grupos.set(c.grupo, [...(grupos.get(c.grupo) ?? []), c]);
  const href = formato === "pdf"
    ? `/app/pesquisa/imprimir${qs({ ...filtros, colunas: sel.join(","), max: linhas })}`
    : `/api/b/busca/exportar${qs({ ...filtros, formato, colunas: sel.join(","), max: linhas })}`;

  return (
    <div className="mx-auto max-w-[1000px] p-5 md:p-8">
      <Link href={`/app/pesquisa${qs(filtros)}`} className="inline-flex items-center gap-1 text-sm text-aco hover:text-tinta"><ArrowLeft size={14} /> Voltar para a pesquisa</Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Exportar empresas</h1>
      <div className="mt-2 flex flex-wrap gap-1">{resumoFiltros(filtros, cidades).map((c) => <span key={c} className="rounded-full bg-fundo px-2 py-0.5 text-xs">{c}</span>)}</div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_280px]">
        <Superficie titulo="Colunas" acao={
          <div className="flex flex-wrap gap-1">
            {Object.entries(MODELOS).map(([k, m]) => (
              <button key={k} type="button" onClick={() => setSel(m.colunas)} className="cursor-pointer rounded-full border border-linha px-2.5 py-0.5 text-xs hover:border-acento">{m.rotulo}</button>
            ))}
            <button type="button" onClick={() => setSel((cols.data ?? []).map((c) => c.id))} className="cursor-pointer rounded-full border border-linha px-2.5 py-0.5 text-xs hover:border-acento">Todas</button>
          </div>
        }>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            {cols.isLoading && <Esqueleto className="h-60 sm:col-span-2" />}
            {[...grupos.entries()].map(([g, cs]) => (
              <fieldset key={g}>
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-aco">{g}</legend>
                {cs.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 py-0.5 text-sm">
                    <input type="checkbox" checked={sel.includes(c.id)} onChange={(e) => setSel((s) => e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id))} />
                    {c.rotulo}
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </Superficie>

        <div className="space-y-4">
          <Superficie titulo="Formato">
            <div className="space-y-1.5 p-4">
              {([["xlsx", "Planilha (Excel)", FileXls], ["csv", "CSV (separado por ;)", FileCsv], ["pdf", "PDF / imprimir (até 1.000)", Printer]] as const).map(([v, r, I]) => (
                <label key={v} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${formato === v ? "border-acento bg-acento-fundo" : "border-linha"}`}>
                  <input type="radio" name="formato" checked={formato === v} onChange={() => setFormato(v)} className="sr-only" />
                  <I size={18} /> {r}
                </label>
              ))}
            </div>
          </Superficie>
          <Superficie titulo="Quantidade">
            <div className="p-4">
              <p className="text-sm">A pesquisa tem <b className="font-mono tabular">{cont.data ? (cont.data.excede ? "mais de 100 mil" : num(total)) : "…"}</b> empresas.</p>
              <Rotulo>Exportar no máximo</Rotulo>
              <Campo inputMode="numeric" placeholder={num(Math.min(total, formato === "pdf" ? 1000 : 100_000))} value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} />
              <p className="mt-1 text-xs text-aco">Ordem: melhores contatos primeiro.</p>
            </div>
          </Superficie>
          <a href={sel.length && linhas ? href : undefined} aria-disabled={!sel.length || !linhas}
            className={`flex h-11 items-center justify-center gap-2 rounded-full text-sm font-medium text-white ${sel.length && linhas ? "bg-acento hover:opacity-90" : "pointer-events-none bg-aco/40"}`}>
            <DownloadSimple size={16} /> {formato === "pdf" ? "Abrir para imprimir" : `Baixar ${num(linhas)} empresas`}
          </a>
          <p className="text-xs text-aco">Dados públicos da Receita Federal e da PGFN. Use para contato comercial com base no legítimo interesse (LGPD) e ofereça sempre a opção de não receber mais.</p>
        </div>
      </div>
    </div>
  );
}

export default function Exportar() {
  return <Suspense><Conteudo /></Suspense>;
}
