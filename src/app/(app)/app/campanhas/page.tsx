"use client";
/** Campanhas de e-mail e WhatsApp: lista, situação de cada uma e descadastros. */
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EnvelopeSimple, PaperPlaneTilt, Plus, WhatsappLogo } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { ROT_STATUS } from "@/lib/campanhas";
import { num } from "@/lib/formato";
import { AvisoErro, Botao, Campo, Esqueleto, Selo, Superficie, Vazio } from "@/componentes/app/ui";


export default function Campanhas() {
  const qc = useQueryClient();
  const c = useQuery({ queryKey: ["campanhas"], queryFn: () => api<any[]>("/campanhas"), refetchInterval: 15_000 });
  const est = useQuery({ queryKey: ["campanhas-estado"], queryFn: () => api<any>("/campanhas/estado") });
  const desc = useQuery({ queryKey: ["descadastros"], queryFn: () => api<any[]>("/descadastros") });
  const [novo, setNovo] = useState("");
  const add = useMutation({ mutationFn: () => api("/descadastros", { method: "POST", json: { destino: novo } }), onSuccess: () => { setNovo(""); qc.invalidateQueries({ queryKey: ["descadastros"] }); } });

  return (
    <div className="mx-auto max-w-[1200px] p-5 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight"><PaperPlaneTilt size={20} /> Campanhas</h1>
          <p className="mt-0.5 text-sm text-aco">E-mail e WhatsApp para as empresas de uma pesquisa ou lista, com limite diário e descadastro automático.</p>
        </div>
        <Link href="/app/campanhas/nova" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-acento px-4 text-sm font-medium text-white hover:opacity-90"><Plus size={15} /> Nova campanha</Link>
      </header>
      {est.data && (!est.data.email || !est.data.whatsapp) && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {!est.data.email && "Envio de e-mail ainda não configurado (Resend). "}{!est.data.whatsapp && "WhatsApp ainda não conectado (open-wa). "}Dá para montar e preparar campanhas; o envio começa quando estiver configurado.
        </p>
      )}
      <AvisoErro erro={c.error} />
      <ul className="mt-5 space-y-2">
        {c.isLoading && <Esqueleto className="h-20" />}
        {c.data?.map((x) => {
          const [rot, tom] = ROT_STATUS[x.status] ?? [x.status, "neutro"];
          const tot = Number(x.total) || 0, env = Number(x.enviados) || 0;
          return (
            <li key={x.id}>
              <Link href={`/app/campanhas/${x.id}`} className="block rounded-[10px] border border-linha bg-papel p-4 hover:border-acento">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium">{x.canal === "email" ? <EnvelopeSimple size={16} /> : <WhatsappLogo size={16} />}{x.nome}</span>
                  <Selo tom={tom}>{rot}</Selo>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fundo"><div className="h-full bg-[var(--color-grafico)]" style={{ width: `${tot ? (env / tot) * 100 : 0}%` }} /></div>
                <p className="mt-1.5 text-xs text-aco">{num(env)} de {num(tot)} enviadas · {num(x.erros)} erros · {num(x.descadastrados)} descadastros · até {num(x.limite_dia)}/dia · criada {new Date(x.criado_em).toLocaleDateString("pt-BR")}</p>
              </Link>
            </li>
          );
        })}
      </ul>
      {c.data?.length === 0 && <Vazio titulo="Nenhuma campanha ainda" texto="Faça uma pesquisa de empresas e mande para elas uma mensagem de apresentação." />}

      <Superficie titulo={`Descadastros (${num(desc.data?.length ?? 0)})`} className="mt-8">
        <div className="p-4">
          <p className="text-sm text-aco">Quem pediu para sair nunca mais recebe mensagens deste escritório. O link vai em todo e-mail; no WhatsApp, quem responder SAIR deve ser incluído aqui.</p>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (novo.trim()) add.mutate(); }}>
            <Campo value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="e-mail ou celular com DDD" className="max-w-xs" />
            <Botao type="submit" disabled={add.isPending}>Adicionar</Botao>
          </form>
          {desc.data && desc.data.length > 0 && (
            <ul className="mt-3 max-h-60 divide-y divide-linha overflow-y-auto text-sm">
              {desc.data.map((d) => <li key={d.destino} className="flex justify-between py-1.5"><span className="font-mono text-[13px]">{d.destino}</span><span className="text-xs text-aco">{d.origem} · {new Date(d.criado_em).toLocaleDateString("pt-BR")}</span></li>)}
            </ul>
          )}
        </div>
      </Superficie>
    </div>
  );
}
