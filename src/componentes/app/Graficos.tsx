"use client";
/**
 * Graficos do painel. Uma serie por grafico, uma cor (--color-grafico,
 * validada para claro e escuro), barras de no maximo 24px com a ponta de
 * dado arredondada em 4px e a base reta, grade em linha fina. Cada grafico
 * tem a sua tabela (botao "Tabela"): ninguem depende de enxergar barra.
 * Clicar numa barra leva para a pesquisa ja filtrada.
 */
import { useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { brl, num } from "@/lib/formato";

type Linha = Record<string, any>;

function Dica({ active, payload, formatar, rotuloX, chave }: any) {
  if (!active || !payload?.length) return null;
  const l = payload[0].payload;
  return (
    <div className="rounded-lg border border-linha bg-papel px-3 py-2 text-xs shadow-[var(--sombra-cartao)]">
      <p className="font-medium text-tinta">{l[rotuloX]}</p>
      <p className="mt-0.5 font-mono tabular text-tinta">{formatar(payload[0].value)}</p>
      {l.empresas != null && chave !== "empresas" && <p className="text-aco">{num(l.empresas)} empresas</p>}
    </div>
  );
}

export function GraficoBarras({
  dados, x, y, formatar = (v: number) => brl(v, true), horizontal = false, altura = 240,
  aoClicar, destaque,
}: {
  dados: Linha[]; x: string; y: string; formatar?: (v: number) => string; horizontal?: boolean;
  altura?: number; aoClicar?: (l: Linha) => void; destaque?: string | null;
}) {
  const [tabela, setTabela] = useState(false);
  const serie = dados.map((d) => ({ ...d, [y]: Number(d[y]) || 0 }));

  return (
    <div>
      <div className="mb-1 flex justify-end">
        <button type="button" onClick={() => setTabela(!tabela)}
          className="cursor-pointer rounded-full px-2 py-0.5 text-[11px] text-aco hover:bg-acento-fundo hover:text-tinta">
          {tabela ? "Gráfico" : "Tabela"}
        </button>
      </div>
      {tabela ? (
        <div className="max-h-[260px] overflow-y-auto">
          <table className="w-full text-sm">
            <tbody>
              {serie.map((l) => (
                <tr key={l[x]} className={`border-b border-linha ${aoClicar ? "cursor-pointer hover:bg-acento-fundo/50" : ""}`}
                  onClick={() => aoClicar?.(l)}>
                  <td className="py-1.5">{l[x]}</td>
                  {l.empresas != null && <td className="py-1.5 text-right font-mono tabular text-aco">{num(l.empresas)}</td>}
                  <td className="py-1.5 text-right font-mono tabular">{formatar(l[y])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height: altura }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} layout={horizontal ? "vertical" : "horizontal"}
              margin={{ top: 4, right: 12, bottom: 0, left: horizontal ? 4 : 0 }} barCategoryGap={horizontal ? 6 : 4}>
              <CartesianGrid stroke="var(--color-linha)" strokeWidth={1} vertical={horizontal} horizontal={!horizontal} />
              {/* Eixos como filhos DIRETOS: o Recharts 2 ignora eixo dentro de Fragment
                  (os rotulos sumiam sem erro nenhum). */}
              <XAxis type={horizontal ? "number" : "category"} dataKey={horizontal ? undefined : x}
                tickFormatter={horizontal ? (v) => formatar(v) : undefined}
                tick={{ fontSize: 11, fill: "var(--color-aco)" }} tickLine={false}
                axisLine={horizontal ? false : { stroke: "var(--color-linha)" }}
                interval={horizontal ? undefined : "preserveStartEnd"} minTickGap={8} />
              <YAxis type={horizontal ? "category" : "number"} dataKey={horizontal ? x : undefined}
                tickFormatter={horizontal ? (v) => (String(v).length > 24 ? String(v).slice(0, 23) + "…" : String(v)) : (v) => formatar(v)}
                width={horizontal ? 150 : 64} interval={horizontal ? 0 : undefined}
                tick={{ fontSize: 11, fill: "var(--color-aco)" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "var(--color-acento-fundo)", opacity: 0.5 }}
                content={<Dica formatar={formatar} rotuloX={x} chave={y} />} />
              <Bar dataKey={y} fill="var(--color-grafico)" maxBarSize={24}
                radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                onClick={(d: any) => aoClicar?.(d?.payload ?? d)}
                className={aoClicar ? "cursor-pointer" : ""}
                shape={destaque ? (p: any) => (
                  <path d={caminhoBarra(p, horizontal)} fill="var(--color-grafico)"
                    opacity={p.payload?.[x] === destaque ? 1 : 0.35} />
                ) : undefined}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Retangulo com a ponta de dado arredondada (4px) e a base reta. */
function caminhoBarra({ x, y, width: w, height: h }: any, horizontal: boolean) {
  const r = Math.min(4, Math.abs(horizontal ? h : w) / 2, Math.abs(horizontal ? w : h));
  if (!w || !h) return "";
  if (horizontal) {
    return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
  }
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/**
 * Cartograma de blocos do Brasil (mesma grade da landing). Intensidade =
 * divida da UF, numa rampa de um matiz so (claro -> escuro). Clicar filtra
 * o painel; clicar de novo limpa.
 */
const GRADE: Record<string, [number, number]> = {
  RR: [2, 0], AP: [4, 0],
  AM: [1, 1], PA: [3, 1], MA: [4, 1], CE: [5, 1], RN: [6, 1],
  AC: [0, 2], RO: [1, 2], TO: [3, 2], PI: [4, 2], PE: [5, 2], PB: [6, 2],
  MT: [2, 3], DF: [3, 3], BA: [4, 3], AL: [6, 3], SE: [5, 3],
  MS: [2, 4], GO: [3, 4], MG: [4, 4], ES: [5, 4],
  PR: [2, 5], SP: [3, 5], RJ: [4, 5],
  SC: [2, 6], RS: [2, 7],
};

export function MapaUfs({ dados, selecionada, aoEscolher, formatar = (v: number) => brl(v, true), rotulo = "Dívida por estado" }:
  { dados: { uf: string; valor_total: number | string; empresas: number | string }[];
    selecionada: string | null; aoEscolher: (uf: string | null) => void; formatar?: (v: number) => string; rotulo?: string }) {
  const max = Math.max(1, ...dados.map((d) => Number(d.valor_total) || 0));
  const por = new Map(dados.map((d) => [d.uf, d]));
  const L = 40, G = 4;
  return (
    <svg viewBox={`0 0 ${7 * (L + G)} ${8 * (L + G)}`} className="mx-auto w-full max-w-[300px]" role="group" aria-label={rotulo}>
      {Object.entries(GRADE).map(([uf, [c, l]]) => {
        const d = por.get(uf);
        const v = Number(d?.valor_total) || 0;
        // raiz quadrada: SP nao apaga os outros 26 estados
        const t = Math.sqrt(v / max);
        const sel = selecionada === uf;
        return (
          <g key={uf} transform={`translate(${c * (L + G)},${l * (L + G)})`}
             className="cursor-pointer" onClick={() => aoEscolher(sel ? null : uf)}
             role="button" tabIndex={0} aria-pressed={sel}
             aria-label={`${uf}: ${formatar(v)}`}
             onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && aoEscolher(sel ? null : uf)}>
            <title>{`${uf} · ${formatar(v)} · ${num(Number(d?.empresas) || 0)} empresas`}</title>
            <rect width={L} height={L} rx={6}
              fill={`color-mix(in oklab, var(--color-grafico) ${Math.round(12 + t * 88)}%, var(--color-papel))`}
              stroke={sel ? "var(--color-tinta)" : "var(--color-papel)"} strokeWidth={sel ? 2 : 2}
              opacity={selecionada && !sel ? 0.45 : 1} />
            <text x={L / 2} y={L / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={600}
              fill={t > 0.45 ? "#fff" : "var(--color-tinta)"}>{uf}</text>
          </g>
        );
      })}
    </svg>
  );
}
