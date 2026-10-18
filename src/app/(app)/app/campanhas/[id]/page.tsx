"use client";
/** Campanha: andamento, prévia com a primeira empresa, teste, iniciar/pausar/cancelar e os envios. */
import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pause, PaperPlaneTilt, Play, X } from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { cnpjMascara, num } from "@/lib/formato";
import { ROT_STATUS } from "@/lib/campanhas";
import { AvisoErro, Botao, Campo, Esqueleto, Indicador, Selo, Superficie } from "@/componentes/app/ui";
import { GraficoBarras } from "@/componentes/app/Graficos";

const ST_ENVIO: Record<string, string> = { pendente: "na fila", enviando: "enviando", enviado: "enviado", erro: "erro", descadastrado: "descadastrado", cancelado: "cancelado" };

export default function Campanha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const c = useQuery({ queryKey: ["campanha", id], queryFn: () => api<any>(`/campanhas/${id}`), refetchInterval: 10_000 });
  const [filtro, setFiltro] = useState("");
  const [pagina, setPagina] = useState(1);
  const envios = useQuery({ queryKey: ["campanha-envios", id, filtro, pagina], queryFn: () => api<any[]>(`/campanhas/${id}/envios${qs({ status: filtro, pagina })}`), refetchInterval: 15_000 });
  const [teste, setTeste] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const acao = useMutation({
    mutationFn: (a: string) => api(`/campanhas/${id}/${a}`, { method: "POST", json: {} }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campanha", id] }); qc.invalidateQueries({ queryKey: ["campanhas"] }); },
  });
  const testar = useMutation({ mutationFn: () => api(`/campanhas/${id}/teste`, { method: "POST", json: { destino: teste } }), onSuccess: () => setMsg("Teste enviado.") });

  if (c.isLoading) return <div className="p-8"><Esqueleto className="h-60" /></div>;
  if (c.error) return <div className="p-8"><AvisoErro erro={c.error} /></div>;
  const { campanha: k, contagem: n, por_dia, previa } = c.data;
  const [rot, tom] = ROT_STATUS[k.status] ?? [k.status, "neutro"];
  const tot = Number(n.total) || 0, env = Number(n.enviados) || 0, pend = Number(n.pendentes) || 0;
  const diasRestantes = pend && k.limite_dia ? Math.ceil(pend / k.limite_dia) : 0;

  return (
    <div className="mx-auto max-w-[1100px] p-5 md:p-8">
      <Link href="/app/campanhas" className="inline-flex items-center gap-1 text-sm text-aco hover:text-tinta"><ArrowLeft size={14} /> Campanhas</Link>
      <header className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">{k.nome} <Selo tom={tom}>{rot}</Selo></h1>
        <div className="flex gap-2">
          {["preparada", "pausada"].includes(k.status) && <Botao variante="primario" disabled={acao.isPending || !tot} onClick={() => acao.mutate("iniciar")}><Play size={14} /> {k.status === "pausada" ? "Retomar" : "Iniciar envio"}</Botao>}
          {k.status === "enviando" && <Botao onClick={() => acao.mutate("pausar")}><Pause size={14} /> Pausar</Botao>}
          {["rascunho", "preparada"].includes(k.status) && <Botao onClick={() => acao.mutate("preparar")}>Remontar lista</Botao>}
          {!["concluida", "cancelada"].includes(k.status) && <Botao variante="fantasma" onClick={() => acao.mutate("cancelar")}><X size={14} /> Cancelar</Botao>}
        </div>
      </header>
      <AvisoErro erro={acao.error} />

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Indicador rotulo="Destinos" valor={num(tot)} />
        <Indicador rotulo="Enviadas" valor={num(env)} detalhe={tot ? `${Math.round((env / tot) * 100)}%` : undefined} />
        <Indicador rotulo="Na fila" valor={num(pend)} detalhe={diasRestantes ? `~${diasRestantes} dia(s) no ritmo atual` : undefined} />
        <Indicador rotulo="Erros" valor={num(n.erros)} />
        <Indicador rotulo="Descadastros" valor={num(n.descadastrados)} />
      </div>
      <p className="mt-2 text-xs text-aco">Até {num(k.limite_dia)} por dia, uma a cada {k.intervalo_s}s, das {k.janela_ini}h às {k.janela_fim}h{k.so_dias_uteis ? ", dias úteis" : ""}. Hoje: {num(n.hoje)}.</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Superficie titulo="Prévia (primeira empresa)">
          <div className="p-4 text-sm">
            {previa ? <>
              <p className="text-xs text-aco">para {previa.destino}</p>
              {k.canal === "email" && <p className="mt-1 font-semibold">{previa.assunto}</p>}
              <p className="mt-2 whitespace-pre-wrap text-[13px]">{previa.corpo}</p>
            </> : <p className="text-aco">Nenhum destino: nenhuma empresa da origem tem {k.canal === "email" ? "e-mail" : "celular"} válido.</p>}
            <form className="mt-4 flex gap-2 border-t border-linha pt-3" onSubmit={(e) => { e.preventDefault(); testar.mutate(); }}>
              <Campo value={teste} onChange={(e) => setTeste(e.target.value)} placeholder={k.canal === "email" ? "seu e-mail" : "seu celular com DDD"} />
              <Botao type="submit" disabled={!teste || testar.isPending}><PaperPlaneTilt size={14} /> Mandar teste</Botao>
            </form>
            <AvisoErro erro={testar.error} />
            {msg && <p className="mt-1 text-xs text-acento">{msg}</p>}
          </div>
        </Superficie>
        <Superficie titulo="Envios por dia">
          <div className="p-4">
            {por_dia.length ? <GraficoBarras dados={por_dia.map((d: any) => ({ dia: d.dia.split("-").reverse().slice(0, 2).join("/"), enviados: Number(d.enviados) }))} x="dia" y="enviados" formatar={(v) => num(v)} altura={220} />
              : <p className="py-10 text-center text-sm text-aco">Ainda não houve envio.</p>}
          </div>
        </Superficie>
      </div>

      <Superficie titulo="Destinos" className="mt-4" acao={
        <div className="flex flex-wrap gap-1">
          {["", "pendente", "enviado", "erro", "descadastrado"].map((s) => (
            <button key={s} type="button" onClick={() => { setFiltro(s); setPagina(1); }} className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs ${filtro === s ? "border-acento bg-acento text-white" : "border-linha"}`}>{s ? ST_ENVIO[s] : "todos"}</button>
          ))}
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-linha text-left text-xs text-aco"><th className="px-4 py-2 font-medium">Empresa</th><th className="px-2 py-2 font-medium">Destino</th><th className="px-2 py-2 font-medium">Situação</th><th className="px-4 py-2 font-medium">Quando</th></tr></thead>
            <tbody>
              {envios.data?.map((v, i) => (
                <tr key={i} className="border-b border-linha">
                  <td className="px-4 py-2"><Link href={`/app/empresas/${v.cnpj}`} className="hover:underline">{v.empresa}</Link><span className="block font-mono text-[11px] text-aco">{cnpjMascara(v.cnpj)}</span></td>
                  <td className="px-2 py-2 font-mono text-[13px]">{v.destino}</td>
                  <td className="px-2 py-2"><Selo tom={v.status === "enviado" ? "ok" : v.status === "erro" ? "perigo" : "neutro"}>{ST_ENVIO[v.status] ?? v.status}</Selo>{v.erro && <span className="block text-[11px] text-aco">{v.erro}</span>}</td>
                  <td className="px-4 py-2 text-xs text-aco">{v.enviado_em ? new Date(v.enviado_em).toLocaleString("pt-BR") : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 p-3">
          <Botao tamanho="p" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</Botao>
          <Botao tamanho="p" disabled={(envios.data?.length ?? 0) < 50} onClick={() => setPagina(pagina + 1)}>Próxima</Botao>
        </div>
      </Superficie>
    </div>
  );
}
