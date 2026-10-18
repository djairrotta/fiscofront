"use client";
/**
 * Primeira mensagem para a empresa (IA): e-mail ou WhatsApp, a partir dos
 * fatos públicos da empresa e do perfil do escritório. O usuário revisa,
 * edita e envia pelo próprio aplicativo (abre o WhatsApp/e-mail com o texto).
 */
import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Copy, EnvelopeSimple, Sparkle, UsersThree, WhatsappLogo } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { AvisoErro, Botao, Campo, Superficie } from "./ui";

export function PrimeiraMensagem({ cnpj, telefone, email }: { cnpj: string; telefone?: string | null; email?: string | null }) {
  const [canal, setCanal] = useState<"email" | "whatsapp">(telefone && !email ? "whatsapp" : "email");
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const m = useMutation({
    mutationFn: () => api<any>("/ia/mensagem", { method: "POST", json: { cnpj, canal } }),
    onSuccess: (r) => { setAssunto(r.assunto || ""); setCorpo(r.corpo || ""); },
  });
  const fone = (telefone || "").replace(/\D/g, "");
  return (
    <Superficie titulo={<span className="flex items-center gap-1.5"><Sparkle size={14} className="text-acento" /> Primeira mensagem</span>}
      acao={<Link href={`/app/pesquisa/semelhantes/${cnpj}`} className="inline-flex items-center gap-1 text-xs text-acento hover:underline"><UsersThree size={13} /> empresas semelhantes</Link>}>
      <div className="space-y-2 p-4">
        <div className="flex gap-1.5">
          {(["email", "whatsapp"] as const).map((c) => (
            <button key={c} type="button" onClick={() => setCanal(c)} aria-pressed={canal === c}
              className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs ${canal === c ? "border-acento bg-acento text-white" : "border-linha"}`}>
              {c === "email" ? "E-mail" : "WhatsApp"}
            </button>
          ))}
          <Botao tamanho="p" variante="primario" className="ml-auto" disabled={m.isPending} onClick={() => m.mutate()}>{m.isPending ? "Escrevendo…" : corpo ? "Escrever outra" : "Escrever com IA"}</Botao>
        </div>
        <AvisoErro erro={m.error} />
        {corpo && (
          <>
            {canal === "email" && <Campo value={assunto} onChange={(e) => setAssunto(e.target.value)} aria-label="Assunto" />}
            <textarea value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={8} aria-label="Mensagem"
              className="w-full rounded-lg border border-linha bg-papel px-3 py-2 text-[13px] outline-none focus:border-acento" />
            <div className="flex flex-wrap gap-1.5">
              <Botao tamanho="p" onClick={() => navigator.clipboard?.writeText(canal === "email" ? `${assunto}\n\n${corpo}` : corpo)}><Copy size={13} /> Copiar</Botao>
              {canal === "whatsapp" && fone && <a href={`https://wa.me/55${fone}?text=${encodeURIComponent(corpo)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linha px-3 text-[13px] hover:bg-acento-fundo"><WhatsappLogo size={13} /> Abrir no WhatsApp</a>}
              {canal === "email" && email && <a href={`mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linha px-3 text-[13px] hover:bg-acento-fundo"><EnvelopeSimple size={13} /> Abrir no e-mail</a>}
            </div>
            <p className="text-[11px] text-aco">Revise antes de enviar. A IA usa só os dados públicos da empresa e o perfil do seu escritório (em Objetivos).</p>
          </>
        )}
      </div>
    </Superficie>
  );
}
