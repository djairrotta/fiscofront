"use client";
/** Ajustes: integrações (e-mail, WhatsApp, IA, pesquisa na internet), chaves da API e perfil do escritório. */
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Copy, GearSix, Key, WarningCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { num } from "@/lib/formato";
import { AvisoErro, Botao, Campo, Superficie } from "@/componentes/app/ui";

function Item({ ok, nome, texto }: { ok?: boolean; nome: string; texto: string }) {
  return (
    <li className="flex items-start gap-2 py-2">
      {ok ? <CheckCircle size={18} className="mt-0.5 shrink-0 text-emerald-600" weight="fill" /> : <WarningCircle size={18} className="mt-0.5 shrink-0 text-amber-600" weight="fill" />}
      <span><span className="font-medium">{nome}</span><span className="block text-xs text-aco">{texto}</span></span>
    </li>
  );
}

export default function Ajustes() {
  const qc = useQueryClient();
  const camp = useQuery({ queryKey: ["campanhas-estado"], queryFn: () => api<any>("/campanhas/estado") });
  const net = useQuery({ queryKey: ["internet-estado"], queryFn: () => api<any>("/internet/estado") });
  const ia = useQuery({ queryKey: ["ia-estado"], queryFn: () => api<any>("/ia/estado") });
  const chaves = useQuery({ queryKey: ["chaves-api"], queryFn: () => api<any[]>("/chaves-api") });
  const [nome, setNome] = useState("");
  const [nova, setNova] = useState<string | null>(null);
  const criar = useMutation({ mutationFn: () => api<any>("/chaves-api", { method: "POST", json: { nome } }), onSuccess: (r) => { setNova(r.chave); setNome(""); qc.invalidateQueries({ queryKey: ["chaves-api"] }); } });
  const revogar = useMutation({ mutationFn: (id: string) => api(`/chaves-api/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["chaves-api"] }) });

  return (
    <div className="mx-auto max-w-[900px] p-5 md:p-8">
      <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight"><GearSix size={20} /> Ajustes</h1>
      <Superficie titulo="Integrações" className="mt-5">
        <ul className="divide-y divide-linha px-4 text-sm">
          <Item ok={camp.data?.email} nome="E-mail (Resend)" texto={camp.data?.email ? `Campanhas saem de ${camp.data.remetente}.` : "Falta RESEND_API_KEY no servidor. Sem ela, campanhas de e-mail ficam prontas mas não saem."} />
          <Item ok={camp.data?.whatsapp} nome="WhatsApp (open-wa)" texto={camp.data?.whatsapp ? "Conectado." : "Falta conectar o open-wa (OPENWA_BASE_URL)."} />
          <Item ok={ia.data?.configurado} nome="IA (OpenRouter)" texto={ia.data?.configurado ? "Pesquisa em linguagem natural, objetivos e mensagens ativos." : "Falta OPENROUTER_API_KEY no servidor."} />
          <Item ok={net.data?.configurado} nome="Pesquisa na internet" texto={net.data?.configurado ? "Ativa." : net.data?.motivo ?? "…"} />
        </ul>
      </Superficie>
      <Superficie titulo="Perfil do escritório" className="mt-4">
        <p className="p-4 text-sm text-aco">O que você oferece, para quem e a assinatura das mensagens ficam em <Link href="/app/pesquisa/objetivos" className="text-acento underline">Objetivos</Link>.</p>
      </Superficie>
      <Superficie titulo={<span className="flex items-center gap-1.5"><Key size={15} /> API</span>} className="mt-4">
        <div className="space-y-3 p-4 text-sm">
          <p className="text-aco">Para o sistema do escritório consultar a pesquisa e a ficha das empresas: <span className="font-mono text-xs">GET /v1/empresas</span> e <span className="font-mono text-xs">GET /v1/empresas/:cnpj</span> em api-fisco.judinfo.com.br, com o cabeçalho <span className="font-mono text-xs">X-Api-Key</span>. 60 requisições por minuto por chave.</p>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}>
            <Campo value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome (ex.: ERP do escritório)" className="max-w-xs" />
            <Botao type="submit" disabled={criar.isPending}>Criar chave</Botao>
          </form>
          <AvisoErro erro={criar.error} />
          {nova && (
            <div className="rounded-lg border border-acento bg-acento-fundo p-3">
              <p className="text-xs">Guarde agora: a chave não aparece de novo.</p>
              <p className="mt-1 flex items-center gap-2 break-all font-mono text-[13px]">{nova}
                <button type="button" aria-label="Copiar" onClick={() => navigator.clipboard?.writeText(nova)} className="cursor-pointer text-aco"><Copy size={14} /></button></p>
            </div>
          )}
          <ul className="divide-y divide-linha">
            {chaves.data?.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                <span><span className="font-medium">{c.nome}</span> <span className="font-mono text-xs text-aco">{c.prefixo}…</span>
                  <span className="block text-xs text-aco">{num(c.usos)} usos{c.ultimo_uso && ` · último ${new Date(c.ultimo_uso).toLocaleString("pt-BR")}`}{c.revogada_em && " · revogada"}</span></span>
                {!c.revogada_em && <Botao tamanho="p" variante="fantasma" onClick={() => revogar.mutate(c.id)}>Revogar</Botao>}
              </li>
            ))}
          </ul>
        </div>
      </Superficie>
    </div>
  );
}
