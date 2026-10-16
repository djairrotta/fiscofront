"use client";
/**
 * Cartograma de blocos do Brasil. Cada UF e um quadrado posicionado
 * geograficamente; a intensidade do preenchimento e a divida inscrita real.
 *
 * Por que cartograma e nao mapa real: o mapa geografico esconde o dado —
 * Roraima ocupa mais tela que o Rio tendo um centesimo das empresas. Em
 * bloco, cada estado pesa pelo que importa aqui, que e o volume.
 *
 * Este e o UNICO momento autoral de movimento da pagina.
 */
import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Uf } from "@/lib/dados";
import { brl, num } from "@/lib/formato";

gsap.registerPlugin(ScrollTrigger);

const GRADE: Record<string, [number, number]> = {
  RR: [2, 0], AP: [4, 0],
  AM: [1, 1], PA: [3, 1], MA: [4, 1], CE: [5, 1], RN: [6, 1],
  AC: [0, 2], RO: [1, 2], TO: [3, 2], PI: [4, 2], PE: [5, 2], PB: [6, 2],
  MT: [2, 3], DF: [3, 3], BA: [4, 3], AL: [6, 3], SE: [5, 3],
  MS: [2, 4], GO: [3, 4], MG: [4, 4], ES: [5, 4],
  PR: [2, 5], SP: [3, 5], RJ: [4, 5],
  SC: [2, 6], RS: [2, 7],
};

const L = 62, G = 6;

export function MapaBrasil({ ufs }: { ufs: Uf[] }) {
  const raiz = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState<Uf | null>(null);

  const max = Math.max(1, ...ufs.map((u) => Number(u.divida_total) || 0));
  const temDado = ufs.some((u) => Number(u.divida_total) > 0);
  const porUf = new Map(ufs.map((u) => [u.uf, u]));

  useEffect(() => {
    if (!raiz.current) return;
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      const blocos = gsap.utils.toArray<SVGRectElement>("[data-bloco]");
      if (reduz) {
        gsap.set(blocos, { opacity: 1, scale: 1 });
        return;
      }
      gsap.set(blocos, { opacity: 0, scale: 0.72, transformOrigin: "center" });
      // Scrub: o preenchimento acompanha a rolagem em vez de disparar sozinho.
      // O visitante sente que esta revelando o dado, nao assistindo a um loop.
      gsap.to(blocos, {
        opacity: 1, scale: 1, duration: 0.5, ease: "power2.out",
        stagger: { each: 0.025, from: "start" },
        scrollTrigger: {
          trigger: raiz.current, start: "top 78%", end: "center center", scrub: 0.6,
        },
      });
    }, raiz);
    return () => ctx.revert();
  }, [ufs.length]);

  const larg = 7 * (L + G) + L;
  const alt = 8 * (L + G);

  return (
    <div ref={raiz} className="relative">
      <svg viewBox={`0 0 ${larg} ${alt}`} className="w-full max-w-[520px]"
           role="img" aria-label="Dívida tributária inscrita por estado">
        {Object.entries(GRADE).map(([uf, [cx, cy]]) => {
          const d = porUf.get(uf);
          const v = Number(d?.divida_total) || 0;
          const i = v > 0 ? 0.14 + 0.86 * Math.sqrt(v / max) : 0.07;
          return (
            <g key={uf} data-bloco
               onMouseEnter={() => d && setAtivo(d)}
               onMouseLeave={() => setAtivo(null)}
               className="cursor-pointer">
              <rect x={cx * (L + G)} y={cy * (L + G)} width={L} height={L} rx="7"
                    fill="var(--color-acento)" fillOpacity={i}
                    stroke="var(--color-acento)" strokeOpacity={v > 0 ? 0.35 : 0.12} />
              <text x={cx * (L + G) + L / 2} y={cy * (L + G) + L / 2 + 5}
                    textAnchor="middle" fontSize="15" fontWeight="600"
                    fill={i > 0.55 ? "#fff" : "var(--color-tinta)"}
                    className="pointer-events-none select-none">
                {uf}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-5 min-h-[72px] rounded-[10px] border border-linha bg-papel p-4"
           aria-live="polite">
        {!temDado ? (
          <p className="text-sm text-aco">
            O mapa se preenche com a dívida inscrita de cada estado assim que a
            base da PGFN for carregada.
          </p>
        ) : ativo ? (
          <>
            <p className="text-sm font-semibold">{ativo.uf}</p>
            <p className="mt-1 text-sm text-aco">
              <span className="tabular font-mono text-tinta">{num(ativo.empresas_com_divida)}</span> empresas
              devem <span className="tabular font-mono text-tinta">{brl(ativo.divida_total, true)}</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-aco">
            Passe o cursor sobre um estado. A intensidade é a dívida inscrita, não o tamanho do território.
          </p>
        )}
      </div>
    </div>
  );
}
