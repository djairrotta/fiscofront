"use client";
/** Painel do funil: quantos leads em cada fase, atrasados, entrada por semana, origem; lembrete diário por e-mail. */
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BellRinging } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { brl, num } from "@/lib/formato";
import { AvisoErro, Esqueleto, Indicador, Superficie } from "@/componentes/app/ui";
import { GraficoBarras } from "@/componentes/app/Graficos";

export default function PainelFunil() {
  const qc = useQueryClient();
  const p = useQuery({ queryKey: ["funil-painel"], queryFn: () => api<any>("/funil/painel") });
  const lembrete = useMutation({ mutationFn: (ativo: boolean) => api("/eu/lembretes", { method: "PUT", json: { ativo } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["funil-painel"] }) });
  const d = p.data;
  const total = Number(d?.totais?.total) || 0;
  return (
    <div className="mx-auto max-w-[1200px] p-5 md:p-8">
      <Link href="/app/leads" className="inline-flex items-center gap-1 text-sm text-aco hover:text-tinta"><ArrowLeft size={14} /> Leads</Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Painel do funil</h1>
      <AvisoErro erro={p.error} />
      {p.isLoading ? <Esqueleto className="mt-5 h-72" /> : d && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Indicador rotulo="Leads" valor={num(total)} />
            <Indicador rotulo="Novos (30 dias)" valor={num(d.totais.novos_30d)} />
            <Indicador rotulo="Para hoje" valor={num(d.totais.hoje)} />
            <Indicador rotulo="Atrasados" valor={num(d.totais.atrasados)} detalhe="próximo passo vencido" />
            <Indicador rotulo="Sem próximo passo" valor={num(d.totais.sem_proximo)} />
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-lg border border-linha bg-papel px-3 py-2 text-sm">
            <input type="checkbox" checked={!!d.lembrete_email} disabled={lembrete.isPending} onChange={(e) => lembrete.mutate(e.target.checked)} />
            <BellRinging size={16} className="text-acento" /> Receber por e-mail, às 7h, os próximos passos do dia e os atrasados
          </label>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Superficie titulo="Leads por fase">
              <div className="p-4"><GraficoBarras dados={d.fases.map((f: any) => ({ ...f, leads: Number(f.leads) }))} x="rotulo" y="leads" formatar={(v) => num(v)} horizontal altura={Math.max(200, d.fases.length * 34)} /></div>
            </Superficie>
            <Superficie titulo="Conversão entre fases">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-linha text-left text-xs text-aco"><th className="px-4 py-2 font-medium">Fase</th><th className="px-2 py-2 text-right font-medium">Leads</th><th className="px-2 py-2 text-right font-medium">% do total</th><th className="px-2 py-2 text-right font-medium">Atrasados</th><th className="px-4 py-2 text-right font-medium">Parado (dias)</th></tr></thead>
                <tbody>{d.fases.map((f: any) => (
                  <tr key={f.valor} className="border-b border-linha">
                    <td className="px-4 py-2">{f.rotulo}</td><td className="px-2 py-2 text-right font-mono tabular">{num(f.leads)}</td>
                    <td className="px-2 py-2 text-right font-mono tabular">{total ? Math.round((Number(f.leads) / total) * 100) : 0}%</td>
                    <td className="px-2 py-2 text-right font-mono tabular">{num(f.atrasados)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular">{f.dias_parado ?? "–"}</td>
                  </tr>))}</tbody>
              </table>
              {d.fases.some((f: any) => Number(f.honorarios) > 0) && <p className="px-4 py-2 text-xs text-aco">Honorários previstos: {brl(d.fases.reduce((a: number, f: any) => a + Number(f.honorarios), 0))}</p>}
            </Superficie>
            <Superficie titulo="Leads novos por semana">
              <div className="p-4"><GraficoBarras dados={d.semanas.map((s: any) => ({ semana: s.semana.split("-").reverse().slice(0, 2).join("/"), novos: Number(s.novos) }))} x="semana" y="novos" formatar={(v) => num(v)} altura={220} /></div>
            </Superficie>
            <Superficie titulo="De onde vieram">
              <div className="p-4"><GraficoBarras dados={d.origens.map((o: any) => ({ origem: o.origem ?? "manual", n: Number(o.n) }))} x="origem" y="n" formatar={(v) => num(v)} horizontal altura={200} /></div>
            </Superficie>
          </div>
        </>
      )}
    </div>
  );
}
