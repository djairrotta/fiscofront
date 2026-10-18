"use client";
/**
 * Histórico da dívida ativa federal da empresa, trimestre a trimestre
 * (publicações da PGFN desde 2020): evolução do valor, o que mudou no
 * último trimestre, inscrições que entraram, que saíram e que mudaram de
 * situação, e o detalhe de cada trimestre.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, ClockCounterClockwise } from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { brl, dataBr, num } from "@/lib/formato";
import { Esqueleto, Modal, Selo, Superficie } from "./ui";

const ORIGEM: Record<string, string> = { PGFN_GERAL: "Tributos (não previdenciária)", PGFN_PREV: "Previdenciária", PGFN_FGTS: "FGTS" };
const tri = (ref: string) => {
  const [a, m] = ref.split("-");
  return `${Math.ceil(Number(m) / 3)}º tri/${a}`;
};
const triCurto = (ref: string) => {
  const [a, m] = ref.split("-");
  return `${Math.ceil(Number(m) / 3)}T${a.slice(2)}`;
};

function Dica({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const l = payload[0].payload;
  return (
    <div className="rounded-lg border border-linha bg-papel px-3 py-2 text-xs shadow-[var(--sombra-cartao)]">
      <p className="font-medium">{tri(l.ref)}</p>
      <p className="mt-0.5 font-mono font-semibold tabular">{brl(l.valor)}</p>
      <p className="text-aco">{num(l.qtd)} inscrições</p>
      {Object.entries(l.por as Record<string, number>).map(([o, v]) => (
        <p key={o} className="text-aco">{ORIGEM[o] ?? o}: <span className="font-mono tabular">{brl(v, true)}</span></p>
      ))}
    </div>
  );
}

export function HistoricoDivida({ cnpj }: { cnpj: string }) {
  const h = useQuery({ queryKey: ["historico", cnpj], queryFn: () => api<any>(`/empresas/${cnpj}/historico`) });
  const [aberto, setAberto] = useState<string | null>(null);
  const [aba, setAba] = useState<"novas" | "saidas" | "mudancas">("novas");
  const [tabela, setTabela] = useState(false);

  const serie = useMemo(() => {
    const m = new Map<string, { ref: string; valor: number; qtd: number; ajuizado: number; por: Record<string, number> }>();
    for (const l of h.data?.serie ?? []) {
      const x = m.get(l.data_ref) ?? { ref: l.data_ref, valor: 0, qtd: 0, ajuizado: 0, por: {} as Record<string, number> };
      x.valor += Number(l.valor); x.qtd += Number(l.qtd); x.ajuizado += Number(l.valor_ajuizado);
      x.por[l.origem] = (x.por[l.origem] ?? 0) + Number(l.valor);
      m.set(l.data_ref, x);
    }
    return [...m.values()].sort((a, b) => a.ref.localeCompare(b.ref));
  }, [h.data]);

  if (h.isLoading) return <Superficie titulo="Histórico da dívida federal"><div className="p-4"><Esqueleto className="h-48" /></div></Superficie>;
  const d = h.data;
  const cobertura = (d?.cobertura ?? []).filter((c: any) => c.ultimo);
  if (!d || !cobertura.length) {
    return (
      <Superficie titulo="Histórico da dívida federal">
        <p className="p-4 text-sm text-aco">A série histórica da PGFN (trimestres desde 2020) ainda está sendo carregada. Assim que terminar, a evolução da dívida aparece aqui.</p>
      </Superficie>
    );
  }
  if (!serie.length) {
    return (
      <Superficie titulo="Histórico da dívida federal">
        <p className="p-4 text-sm text-aco">Nenhuma inscrição em dívida ativa federal desta empresa nos trimestres publicados desde {tri(cobertura.map((c: any) => c.primeiro).sort()[0])}.</p>
      </Superficie>
    );
  }
  const s = d.sinais;
  const ultimo = serie[serie.length - 1];
  const penultimo = serie[serie.length - 2];
  const delta = penultimo ? ultimo.valor - penultimo.valor : 0;
  const ev = d.eventos;

  return (
    <Superficie titulo="Histórico da dívida federal" acao={
      <button type="button" onClick={() => setTabela(!tabela)} className="cursor-pointer rounded-full px-2 py-0.5 text-[11px] text-aco hover:bg-acento-fundo hover:text-tinta">
        {tabela ? "Gráfico" : "Tabela"}
      </button>}>
      <div className="space-y-4 p-4">
        {/* O que mudou */}
        <div className="flex flex-wrap gap-1.5">
          {s?.devedora_desde && <Selo>devedora desde {tri(s.devedora_desde)}</Selo>}
          {Number(s?.novas_tri) > 0 && <Selo tom="perigo">{s.novas_tri} inscrição(ões) nova(s) no último trimestre · {brl(s.novas_tri_valor, true)}</Selo>}
          {Number(s?.novas_12m) > Number(s?.novas_tri) && <Selo tom="alerta">{s.novas_12m} nova(s) em 12 meses</Selo>}
          {Number(s?.rescindidas_12m) > 0 && <Selo tom="perigo">acordo caiu em {s.rescindidas_12m} inscrição(ões) (12 meses)</Selo>}
          {Number(s?.negociadas_tri) > 0 && <Selo tom="ok">negociou {s.negociadas_tri} no trimestre</Selo>}
          {Number(s?.ajuizadas_tri) > 0 && <Selo tom="alerta">{s.ajuizadas_tri} ajuizada(s) no trimestre</Selo>}
          {Number(s?.saidas_12m) > 0 && <Selo tom="ok">{s.saidas_12m} saíram da dívida ativa em 12 meses · {brl(s.saidas_12m_valor, true)}</Selo>}
          {s?.variacao_12m_pct != null && <Selo tom={Number(s.variacao_12m_pct) > 0 ? "alerta" : "ok"}>
            {Number(s.variacao_12m_pct) > 0 ? "+" : ""}{Number(s.variacao_12m_pct).toLocaleString("pt-BR")}% em 12 meses</Selo>}
        </div>

        <div className="grid gap-px overflow-hidden rounded-lg border border-linha bg-linha sm:grid-cols-3">
          <div className="bg-papel px-4 py-3">
            <p className="text-xs text-aco">{tri(ultimo.ref)}</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tabular">{brl(ultimo.valor)}</p>
            <p className="text-xs text-aco">{num(ultimo.qtd)} inscrições</p>
          </div>
          <div className="bg-papel px-4 py-3">
            <p className="text-xs text-aco">Contra o trimestre anterior</p>
            <p className={`mt-0.5 flex items-center gap-1 font-mono text-lg font-semibold tabular ${delta > 0 ? "text-amber-700 dark:text-amber-400" : delta < 0 ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
              {delta > 0 ? <ArrowUpRight size={16} /> : delta < 0 ? <ArrowDownRight size={16} /> : null}{brl(Math.abs(delta), true)}
            </p>
            <p className="text-xs text-aco">{penultimo ? tri(penultimo.ref) : "sem trimestre anterior"}</p>
          </div>
          <div className="bg-papel px-4 py-3">
            <p className="text-xs text-aco">Maior valor da série</p>
            {(() => { const mx = serie.reduce((a, b) => (b.valor > a.valor ? b : a)); return <>
              <p className="mt-0.5 font-mono text-lg font-semibold tabular">{brl(mx.valor)}</p>
              <p className="text-xs text-aco">{tri(mx.ref)}</p></>; })()}
          </div>
        </div>

        {tabela ? (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-linha text-left text-xs text-aco">
                <th className="py-1.5 font-medium">Trimestre</th><th className="py-1.5 text-right font-medium">Inscrições</th>
                <th className="py-1.5 text-right font-medium">Valor</th><th className="py-1.5 text-right font-medium">Ajuizado</th><th /></tr></thead>
              <tbody>
                {[...serie].reverse().map((l) => (
                  <tr key={l.ref} className="border-b border-linha last:border-0">
                    <td className="py-1.5">{tri(l.ref)}</td>
                    <td className="py-1.5 text-right font-mono tabular">{num(l.qtd)}</td>
                    <td className="py-1.5 text-right font-mono tabular">{brl(l.valor)}</td>
                    <td className="py-1.5 text-right font-mono tabular text-aco">{brl(l.ajuizado, true)}</td>
                    <td className="py-1.5 pl-3 text-right"><button type="button" onClick={() => setAberto(l.ref)} className="cursor-pointer text-xs text-acento hover:underline dark:text-acento-claro">Abrir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                onClick={(e: any) => e?.activePayload?.[0] && setAberto(e.activePayload[0].payload.ref)}>
                <CartesianGrid vertical={false} stroke="var(--color-linha)" />
                <XAxis dataKey="ref" tickFormatter={triCurto} tick={{ fontSize: 11, fill: "var(--color-aco)" }} axisLine={false} tickLine={false} minTickGap={16} />
                <YAxis tickFormatter={(v) => brl(v, true)} tick={{ fontSize: 11, fill: "var(--color-aco)" }} axisLine={false} tickLine={false} width={72} />
                <Tooltip content={<Dica />} cursor={{ stroke: "var(--color-aco)", strokeDasharray: "3 3" }} />
                <Area type="linear" dataKey="valor" stroke="var(--color-grafico)" strokeWidth={2} fill="var(--color-grafico)" fillOpacity={0.12}
                  dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-papel)", cursor: "pointer" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Eventos */}
        <div>
          <div className="flex gap-1 border-b border-linha" role="tablist">
            {([["novas", `Entraram (${ev.novas.length})`], ["saidas", `Saíram (${ev.saidas.length})`], ["mudancas", `Mudaram de situação (${ev.mudancas.length})`]] as const).map(([k, r]) => (
              <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => setAba(k)}
                className={`cursor-pointer border-b-2 px-3 py-2 text-[13px] ${aba === k ? "border-acento font-medium" : "border-transparent text-aco hover:text-tinta"}`}>{r}</button>
            ))}
          </div>
          <ul className="max-h-72 divide-y divide-linha overflow-y-auto">
            {aba === "novas" && ev.novas.map((i: any) => (
              <li key={i.origem + i.numero_inscricao} className="flex items-start justify-between gap-3 py-2 text-sm">
                <span className="min-w-0"><span className="font-mono text-xs tabular">{i.numero_inscricao}</span> · {i.receita}
                  <span className="block text-xs text-aco">apareceu em {tri(i.primeiro_ref)} · inscrita em {dataBr(i.data_inscricao)} · {i.situacao_ultima}</span></span>
                <span className="shrink-0 font-mono tabular">{brl(i.valor_primeiro)}</span>
              </li>
            ))}
            {aba === "saidas" && ev.saidas.map((i: any) => (
              <li key={i.origem + i.numero_inscricao} className="flex items-start justify-between gap-3 py-2 text-sm">
                <span className="min-w-0"><span className="font-mono text-xs tabular">{i.numero_inscricao}</span> · {i.receita}
                  <span className="block text-xs text-aco">última vez em {tri(i.ultimo_ref)} · {i.situacao_ultima} (paga, extinta ou cancelada depois disso)</span></span>
                <span className="shrink-0 font-mono tabular">{brl(i.valor_ultimo)}</span>
              </li>
            ))}
            {aba === "mudancas" && ev.mudancas.map((i: any) => (
              <li key={i.origem + i.numero_inscricao} className="flex items-start justify-between gap-3 py-2 text-sm">
                <span className="min-w-0"><span className="font-mono text-xs tabular">{i.numero_inscricao}</span> · {i.receita}
                  <span className="block text-xs text-aco">{tri(i.mudou_ref)}: {i.situacao_anterior} → <b className="text-tinta">{i.situacao_ultima}</b></span>
                  {i.acordo_caiu && <Selo tom="perigo">acordo caiu</Selo>}{i.negociou && <Selo tom="ok">negociou</Selo>}</span>
                <span className="shrink-0 font-mono tabular">{brl(i.valor_ultimo)}</span>
              </li>
            ))}
            {ev[aba].length === 0 && <li className="py-3 text-sm text-aco">Nada neste período.</li>}
          </ul>
        </div>
        <p className="flex gap-1.5 text-[11px] leading-relaxed text-aco"><ClockCounterClockwise size={13} className="mt-0.5 shrink-0" />
          {d.aviso} Cobertura: {cobertura.map((c: any) => `${ORIGEM[c.origem] ?? c.origem} de ${tri(c.primeiro)} a ${tri(c.ultimo)}`).join("; ")}.</p>
      </div>
      <Trimestre cnpj={cnpj} refData={aberto} aoFechar={() => setAberto(null)} />
    </Superficie>
  );
}

function Trimestre({ cnpj, refData, aoFechar }: { cnpj: string; refData: string | null; aoFechar: () => void }) {
  const t = useQuery({
    queryKey: ["historico-tri", cnpj, refData], enabled: !!refData,
    queryFn: () => api<any>(`/empresas/${cnpj}/historico/trimestre${qs({ ref: refData })}`),
  });
  return (
    <Modal aberto={!!refData} aoFechar={aoFechar} largura="max-w-3xl" titulo={refData ? `Inscrições no ${tri(refData)}` : ""}>
      <div className="max-h-[70vh] overflow-y-auto p-4">
        {t.isLoading ? <Esqueleto className="h-40" /> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-linha text-left text-xs text-aco">
              <th className="py-1.5 font-medium">Inscrição</th><th className="py-1.5 font-medium">Situação</th>
              <th className="py-1.5 font-medium">Receita</th><th className="py-1.5 text-right font-medium">Valor</th></tr></thead>
            <tbody>
              {(t.data?.itens ?? []).map((i: any) => (
                <tr key={i.origem + i.numero_inscricao} className="border-b border-linha align-top last:border-0">
                  <td className="py-1.5 pr-2"><span className="font-mono text-xs tabular">{i.numero_inscricao}</span>
                    <span className="block text-xs text-aco">inscrita {dataBr(i.data_inscricao)}</span>
                    {i.entrou_neste && <Selo tom="perigo">entrou neste trimestre</Selo>}</td>
                  <td className="py-1.5 pr-2 text-xs">{i.situacao_ultima}{i.ajuizado_ultimo && <span className="block text-aco">ajuizada</span>}</td>
                  <td className="py-1.5 pr-2 text-xs">{i.receita}<span className="block text-aco">{ORIGEM[i.origem]}</span></td>
                  <td className="py-1.5 text-right font-mono tabular">{brl(i.valor_ultimo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-[11px] text-aco">Situação e valor da última publicação em que a inscrição apareceu. O total do trimestre (gráfico) usa o valor publicado naquela data.</p>
      </div>
    </Modal>
  );
}
