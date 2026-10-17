"use client";
/** Banco de teses, com o selo de maturidade e o atalho para as devedoras do tributo. */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { dataBr } from "@/lib/formato";
import { AvisoErro, Esqueleto, Selo, Vazio } from "@/componentes/app/ui";

const MAT: Record<string, { r: string; tom: "ok" | "alerta" | "acento" | "perigo" }> = {
  consolidada_favoravel: { r: "Consolidada a favor", tom: "ok" },
  modulada: { r: "Modulada", tom: "alerta" },
  em_disputa: { r: "Em disputa", tom: "acento" },
  derrotada: { r: "Derrotada", tom: "perigo" },
};
const TRIBUTO_BASE: Record<string, string> = { PIS: "PIS", COFINS: "COFINS" };

export default function Teses() {
  const t = useQuery({ queryKey: ["teses"], queryFn: () => api<any[]>("/teses") });
  return (
    <div className="mx-auto max-w-[1000px] p-5 md:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Teses</h1>
      <p className="mt-0.5 text-sm text-aco">Cada tese com a situação nos tribunais. Tese derrotada continua listada, com o selo, para ninguém oferecer o que já caiu.</p>
      <div className="mt-4"><AvisoErro erro={t.error} /></div>
      <div className="mt-5 space-y-3">
        {t.isLoading && <Esqueleto className="h-40" />}
        {t.data?.length === 0 && <Vazio titulo="Nenhuma tese cadastrada" />}
        {t.data?.map((x) => {
          const m = MAT[x.maturidade] ?? { r: x.maturidade, tom: "acento" as const };
          const tributos: string[] = (x.tributos_divida ?? []).map((s: string) => TRIBUTO_BASE[s] ?? s);
          return (
            <article key={x.slug} className="rounded-[10px] border border-linha bg-papel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{x.nome}</h2>
                  <p className="mt-0.5 text-sm text-aco">{x.tributo} · {x.fundamento_legal}</p>
                </div>
                <Selo tom={m.tom}>{m.r}</Selo>
              </div>
              {Array.isArray(x.checklist_docs) && x.checklist_docs.length > 0 && (
                <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm text-aco">
                  {x.checklist_docs.slice(0, 5).map((c: any, i: number) => <li key={i}>{typeof c === "string" ? c : c?.item ?? JSON.stringify(c)}</li>)}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-aco">
                <span>{x.verificada_em ? `Verificada em ${dataBr(x.verificada_em)}` : "Sem data de verificação"}</span>
                {x.maturidade !== "derrotada" && tributos.length > 0 && (
                  <Link href={`/app/pesquisa${qs({ tributo: tributos.join(",") })}`} className="inline-flex items-center gap-1 font-medium text-acento hover:underline dark:text-acento-claro">
                    Devedoras de {tributos.join("/")} <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
