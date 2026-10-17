"use client";
/**
 * Palco 3D guiado pelo scroll.
 *
 * NAO e WebGL ao vivo. E uma sequencia de quadros pre-renderizados
 * (Three.js headless, ver scratchpad/cena) desenhada num canvas. Motivo:
 * roda igual em celular fraco, nao carrega runtime 3D no bundle e nao
 * depende de GPU. O custo e so banda, e so dos quadros que o visitante
 * realmente alcanca.
 *
 * Todo o texto vive no DOM por cima do canvas: busca, leitor de tela e
 * traducao enxergam a pagina inteira mesmo sem o canvas pintar.
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const TOTAL = 72;
const CAPS = 4;  // capitulos: define a alternancia de lado do objeto
const caminho = (i: number, tam: "d" | "m") =>
  `/cena/${tam}/f_${String(i + 1).padStart(3, "0")}.webp`;

export interface Capitulo { titulo: string; texto: string }

export function CenaScroll({ capitulos, children }:
  { capitulos: Capitulo[]; children?: React.ReactNode }) {
  const scrolly = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const heroi = useRef<HTMLDivElement>(null);
  const [reduz, setReduz] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduz(mq.matches);
    if (mq.matches) return;

    const cv = canvas.current, sec = scrolly.current;
    if (!cv || !sec) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const tam: "d" | "m" = window.innerWidth < 768 ? "m" : "d";
    const imgs: (HTMLImageElement | null)[] = new Array(TOTAL).fill(null);
    let atual = 0, vivo = true, prog = 0;

    const dimensionar = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = cv.getBoundingClientRect();
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      desenhar(atual);
    };

    // Usa o quadro carregado mais proximo: nunca pisca enquanto baixa.
    function maisProximo(i: number) {
      if (imgs[i]) return imgs[i];
      for (let d = 1; d < TOTAL; d++) {
        if (imgs[i - d]) return imgs[i - d];
        if (imgs[i + d]) return imgs[i + d];
      }
      return null;
    }

    // Composicao: o objeto NUNCA fica sob o texto.
    // No heroi (p baixo) ele desce e encolhe para liberar a manchete.
    // Depois alterna de lado a cada capitulo, oposto ao texto.
    function desenhar(i: number, p = prog) {
      const im = maisProximo(i);
      if (!im || !ctx) return;
      const { width: w, height: h } = cv!;
      ctx.clearRect(0, 0, w, h);

      const heroi = Math.min(1, Math.max(0, (p - 0.02) / 0.12)); // 0 no heroi, 1 depois
      const estreito = w / Math.min(2, window.devicePixelRatio || 1) < 768;

      const escala = estreito ? (0.62 + 0.30 * heroi) : (0.76 + 0.14 * heroi);
      const e = Math.min(w / im.naturalWidth, h / im.naturalHeight) * escala;
      const lw = im.naturalWidth * e, lh = im.naturalHeight * e;

      // Desce no heroi (abre espaco em cima), sobe depois (abre espaco embaixo).
      const by = (estreito ? 0.72 - 0.20 * heroi : 0.60 - 0.09 * heroi) * h;
      // Alterna de lado junto com os capitulos; no celular fica centrado.
      const bx = estreito ? 0.5 * w
        : (0.5 + Math.cos(p * CAPS * Math.PI) * 0.15 * heroi) * w;

      ctx.drawImage(im, bx - lw / 2, by - lh / 2, lw, lh);
    }

    function carregar(i: number): Promise<void> {
      if (imgs[i]) return Promise.resolve();
      return new Promise((ok) => {
        const im = new Image();
        im.decoding = "async";
        im.onload = () => { imgs[i] = im; if (vivo && i === atual) desenhar(i); ok(); };
        im.onerror = () => ok();
        im.src = caminho(i, tam);
      });
    }

    // Progressivo: 1 a cada 8, depois 4, 2, 1, em lotes de 6.
    (async () => {
      await carregar(0);
      dimensionar();
      for (const passo of [8, 4, 2, 1]) {
        const alvos: number[] = [];
        for (let i = 0; i < TOTAL; i += passo) if (!imgs[i]) alvos.push(i);
        for (let i = 0; i < alvos.length; i += 6) {
          if (!vivo) return;
          await Promise.all(alvos.slice(i, i + 6).map(carregar));
        }
      }
    })();

    const gctx = gsap.context(() => {
      // O heroi cede o palco: sem isto, manchete e capitulo disputam a tela.
      if (heroi.current) {
        gsap.to(heroi.current, {
          opacity: 0, y: -40, ease: "none",
          scrollTrigger: {
            trigger: sec, start: "top top",
            end: () => "+=" + (sec.offsetHeight - window.innerHeight * 1.45) * 0.14,
            scrub: 0.4, invalidateOnRefresh: true,
          },
        });
      }
      const proxy = { p: 0 };
      gsap.to(proxy, {
        p: 1, ease: "none",
        onUpdate: () => {
          prog = proxy.p;
          atual = Math.round(prog * (TOTAL - 1));
          desenhar(atual, prog);
        },
        scrollTrigger: {
          trigger: sec, start: "top top",
          end: () => "+=" + (sec.offsetHeight - window.innerHeight * 1.45),
          scrub: 0.4, invalidateOnRefresh: true,
        },
      });
    }, sec);

    window.addEventListener("resize", dimensionar);
    return () => {
      vivo = false;
      window.removeEventListener("resize", dimensionar);
      gctx.revert();
    };
  }, []);

  // Sem movimento: quadro final estatico e os capitulos viram lista.
  if (reduz) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-20">
        {children}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={caminho(TOTAL - 1, "d")} alt="Mapa do Brasil em relevo com a peça gerada ao lado"
          className="mx-auto mt-12 w-full max-w-xl" />
        <ol className="mt-12 grid gap-8 sm:grid-cols-2">
          {capitulos.map((c) => (
            <li key={c.titulo}>
              <h3 className="text-lg font-semibold tracking-tight">{c.titulo}</h3>
              <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-aco">{c.texto}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section ref={scrolly} className="relative" style={{ height: "560vh" }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <canvas ref={canvas} role="img"
          aria-label="Mapa do Brasil em relevo: os estados sobem conforme o volume de empresas, a tese acende um recorte e a peça é gerada"
          className="absolute inset-0 h-full w-full" />
        <div ref={heroi} className="pointer-events-none absolute inset-0">
          <div className="mx-auto flex h-full max-w-6xl flex-col px-6">
            {children}
          </div>
        </div>
        {/* Capitulos: entram e saem conforme o scroll da propria secao. */}
        <div className="absolute inset-0">
          <div className="mx-auto h-full max-w-6xl px-6">
            {capitulos.map((c, i) => (
              <CapituloTexto key={c.titulo} indice={i} total={capitulos.length} {...c} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Um capitulo: ancorado embaixo, alterna de lado, aparece na sua faixa. */
function CapituloTexto({ titulo, texto, indice, total }:
  Capitulo & { indice: number; total: number }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sec = el.current?.closest("section");
    if (!el.current || !sec) return;
    const gctx = gsap.context(() => {
      // Cada capitulo ocupa uma faixa igual do trecho rolavel.
      const faixa = 1 / total;
      const ini = indice * faixa, fim = ini + faixa;
      gsap.set(el.current, { opacity: 0, y: 24 });
      gsap.timeline({
        scrollTrigger: {
          trigger: sec,
          start: () => "top+=" + (sec.offsetHeight - window.innerHeight * 1.45) * ini + " top",
          end: () => "top+=" + (sec.offsetHeight - window.innerHeight * 1.45) * fim + " top",
          scrub: 0.5,
        },
      })
        .to(el.current, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" })
        .to(el.current, { opacity: 1, duration: 0.5 })
        .to(el.current, { opacity: 0, y: -18, duration: 0.25, ease: "power2.in" });
    }, el);
    return () => gctx.revert();
  }, [indice, total]);

  const esquerda = indice % 2 === 0;
  return (
    <div ref={el}
      className={`absolute bottom-[12vh] max-w-[30rem] px-6 md:bottom-[18vh] ${
        esquerda ? "left-0 md:left-6" : "right-0 md:right-6 md:text-right"}`}>
      <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">{titulo}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-aco">{texto}</p>
    </div>
  );
}
