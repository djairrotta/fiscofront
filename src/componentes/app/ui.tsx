"use client";
/**
 * Pecas basicas do painel. Densidade alta, um raio (10px), pill so em
 * controle. Nenhuma cor fora dos tokens do globals.css.
 */
import { useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";

type BotaoProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario" | "fantasma" | "perigo";
  tamanho?: "p" | "m";
};

export function Botao({ variante = "secundario", tamanho = "m", className = "", ...p }: BotaoProps) {
  const base = "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium " +
    "transition-[background-color,transform,opacity] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer";
  const t = tamanho === "p" ? "h-8 px-3 text-[13px]" : "h-9 px-4 text-sm";
  const v = {
    primario: "botao-liquido text-white",
    secundario: "border border-linha bg-papel text-tinta hover:bg-acento-fundo",
    fantasma: "text-aco hover:bg-acento-fundo hover:text-tinta",
    perigo: "border border-red-200 bg-papel text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950",
  }[variante];
  return <button type="button" className={`${base} ${t} ${v} ${className}`} {...p} />;
}

export function Campo({ className = "", ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-9 w-full rounded-lg border border-linha bg-papel px-3 text-sm text-tinta placeholder:text-aco/70 outline-none transition-colors focus:border-acento ${className}`}
      {...p}
    />
  );
}

export function Selecao({ className = "", children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-9 w-full cursor-pointer rounded-lg border border-linha bg-papel px-2.5 text-sm text-tinta outline-none focus:border-acento ${className}`}
      {...p}
    >
      {children}
    </select>
  );
}

export function Rotulo({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-aco">{children}</label>;
}

export function Superficie({ children, className = "", titulo, acao }:
  { children: React.ReactNode; className?: string; titulo?: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section className={`rounded-[10px] border border-linha bg-papel ${className}`}>
      {(titulo || acao) && (
        <header className="flex items-center justify-between gap-3 border-b border-linha px-4 py-3">
          <h2 className="text-sm font-semibold">{titulo}</h2>
          {acao}
        </header>
      )}
      {children}
    </section>
  );
}

export function Vazio({ titulo, texto, acao }: { titulo: string; texto?: string; acao?: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-linha p-8 text-center">
      <p className="text-sm font-medium">{titulo}</p>
      {texto && <p className="mx-auto mt-1 max-w-md text-sm text-aco">{texto}</p>}
      {acao && <div className="mt-4 flex justify-center">{acao}</div>}
    </div>
  );
}

export function Esqueleto({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-linha/60 ${className}`} />;
}

/** Erro da API com a mensagem que ela mandou. 503 de base em preparo tem texto proprio. */
export function AvisoErro({ erro }: { erro: any }) {
  if (!erro) return null;
  if (erro?.dados?.preparando) {
    return (
      <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        A base de pesquisa está sendo montada depois de uma atualização. Esta tela recarrega sozinha em instantes.
      </div>
    );
  }
  return (
    <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {erro?.message ?? "Algo deu errado."}
    </div>
  );
}

export function Selo({ children, tom = "neutro", className = "" }:
  { children: React.ReactNode; tom?: "neutro" | "acento" | "alerta" | "perigo" | "ok"; className?: string }) {
  const t = {
    neutro: "bg-fundo text-aco border-linha",
    acento: "bg-acento-fundo text-acento border-transparent dark:text-acento-claro",
    alerta: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900",
    perigo: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900",
    ok: "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900",
  }[tom];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${t} ${className}`}>{children}</span>;
}

/** Gaveta lateral. Fecha com Esc e clique fora; foco volta ao gatilho. */
export function Gaveta({ aberta, aoFechar, titulo, children, largura = "max-w-xl" }:
  { aberta: boolean; aoFechar: () => void; titulo?: React.ReactNode; children: React.ReactNode; largura?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberta) return;
    const antes = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", k);
    ref.current?.focus();
    return () => { window.removeEventListener("keydown", k); antes?.focus?.(); };
  }, [aberta, aoFechar]);
  if (!aberta) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-tinta/30 backdrop-blur-[1px]" onClick={aoFechar} />
      <div ref={ref} tabIndex={-1}
        className={`relative flex h-full w-full ${largura} flex-col border-l border-linha bg-papel shadow-[var(--sombra-cartao)] outline-none animate-[entrar_220ms_var(--ease-entrada)]`}>
        <header className="flex items-center justify-between gap-3 border-b border-linha px-5 py-3">
          <div className="min-w-0 text-sm font-semibold">{titulo}</div>
          <button type="button" onClick={aoFechar} aria-label="Fechar"
            className="cursor-pointer rounded-full p-1.5 text-aco hover:bg-acento-fundo hover:text-tinta"><X size={16} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Modal({ aberto, aoFechar, titulo, children, largura = "max-w-2xl" }:
  { aberto: boolean; aoFechar: () => void; titulo?: React.ReactNode; children: React.ReactNode; largura?: string }) {
  useEffect(() => {
    if (!aberto) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [aberto, aoFechar]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[8vh]" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-tinta/30" onClick={aoFechar} />
      <div className={`relative w-full ${largura} rounded-[10px] border border-linha bg-papel shadow-[var(--sombra-cartao)]`}>
        {titulo && (
          <header className="flex items-center justify-between gap-3 border-b border-linha px-5 py-3">
            <div className="min-w-0 flex-1 text-sm font-semibold">{titulo}</div>
            <button type="button" onClick={aoFechar} aria-label="Fechar"
              className="cursor-pointer rounded-full p-1.5 text-aco hover:bg-acento-fundo hover:text-tinta"><X size={16} /></button>
          </header>
        )}
        {children}
      </div>
    </div>
  );
}

/** Numero grande de painel. */
export function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: React.ReactNode; detalhe?: React.ReactNode }) {
  return (
    <div className="bg-papel px-5 py-4">
      <p className="text-xs text-aco">{rotulo}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-aco">{detalhe}</p>}
    </div>
  );
}
