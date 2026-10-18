"use client";
/**
 * Entrar e criar conta no mesmo formulario.
 *
 * Regras de formulario do sistema: rotulo ACIMA do campo, erro ABAIXO,
 * nunca placeholder no lugar de rotulo. O erro do servidor aparece onde
 * a pessoa esta olhando, nao no topo da pagina.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

type Modo = "login" | "registrar";

export function FormularioEntrar({ destino, comecaEm = "login" }:
  { destino?: string; comecaEm?: Modo }) {
  const [modo, setModo] = useState<Modo>(comecaEm);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null); setEnviando(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/sessao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          acao: modo, nome: f.get("nome"), oab: f.get("oab"),
          email: f.get("email"), senha: f.get("senha"),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d?.erro ?? "Não foi possível entrar."); return; }
      router.replace(destino && destino.startsWith("/app") ? destino : "/app");
      router.refresh();
    } catch {
      setErro("Sem conexão com o servidor.");
    } finally { setEnviando(false); }
  }

  const campo =
    "h-11 w-full rounded-superficie border border-linha bg-fundo px-3.5 text-[15px] " +
    "text-tinta placeholder:text-aco/60 focus-visible:border-acento";

  return (
    <div className="mt-8 md:mt-0">
      <h1 className="text-2xl font-semibold tracking-tight">
        {modo === "login" ? "Entrar" : "Criar conta"}
      </h1>
      <p className="mt-2 text-sm text-aco">
        {modo === "login"
          ? "Use o e-mail cadastrado no escritório."
          : "A conta já entra no plano Pesquisa."}
      </p>

      <form onSubmit={enviar} className="mt-7 space-y-4" noValidate>
        {modo === "registrar" && (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="nome" className="text-sm font-medium">Nome ou escritório</label>
              <input id="nome" name="nome" required autoComplete="organization" className={campo} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="oab" className="text-sm font-medium">
                CRC <span className="font-normal text-aco">(opcional)</span>
              </label>
              {/* O campo segue com name="oab" porque e o nome que a API espera. */}
              <input id="oab" name="oab" placeholder="SP-123456/O" className={campo} />
            </div>
          </>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">E-mail</label>
          <input id="email" name="email" type="email" required inputMode="email"
            autoComplete="email" className={campo} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="senha" className="text-sm font-medium">Senha</label>
          <input id="senha" name="senha" type="password" required
            autoComplete={modo === "login" ? "current-password" : "new-password"}
            className={campo} />
          {modo === "registrar" && (
            <p className="text-xs text-aco">Pelo menos 10 caracteres.</p>
          )}
        </div>

        {erro && (
          <p role="alert" className="rounded-superficie bg-red-50 px-3.5 py-2.5 text-sm text-red-900 ring-1 ring-inset ring-red-200">
            {erro}
          </p>
        )}

        <button type="submit" disabled={enviando}
          className="botao-liquido inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-white disabled:opacity-70">
          {enviando ? "Aguarde" : modo === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button type="button"
        onClick={() => { setModo(modo === "login" ? "registrar" : "login"); setErro(null); }}
        className="mt-6 cursor-pointer text-sm text-aco underline underline-offset-4 hover:text-tinta">
        {modo === "login" ? "Ainda não tenho conta" : "Já tenho conta"}
      </button>
    </div>
  );
}
