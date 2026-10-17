"use client";
/**
 * Leads: o funil do escritorio em kanban arrastavel (ou lista).
 * Cada cartao e uma empresa devedora; abrir mostra contato, proximo passo,
 * historico e o atalho para a ficha completa.
 */
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarBlank, EnvelopeSimple, ListBullets, Kanban as IconeKanban, MagnifyingGlass, Phone, Plus, Trash, WhatsappLogo, ArrowSquareOut, ArrowClockwise,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { brl, num, cnpjMascara, dataBr, telefoneFmt, ehCelular, COR_FASE } from "@/lib/formato";
import { Kanban } from "@/componentes/app/Kanban";
import { AvisoErro, Botao, Campo, Esqueleto, Gaveta, Rotulo, Selecao, Selo, Vazio } from "@/componentes/app/ui";

interface Lead {
  id: string; cnpj: string | null; nome: string; fase: string; posicao: number; uf: string | null; municipio: string | null;
  divida_total: string | null; tributo_principal: string | null; telefones: any[]; emails: any[]; etiquetas: string[];
  proximo_passo: string | null; proximo_em: string | null; criado_em: string;
}

function Conteudo() {
  const qc = useQueryClient();
  const router = useRouter();
  const sp = useSearchParams();
  const [modo, setModo] = useState<"kanban" | "lista">("kanban");
  const [filtro, setFiltro] = useState("");
  const [novoCnpj, setNovoCnpj] = useState("");
  const [novaFase, setNovaFase] = useState("");
  const aberto = sp.get("lead");

  const funil = useQuery({ queryKey: ["funil"], queryFn: () => api<any[]>("/funil") });
  const leads = useQuery({ queryKey: ["leads"], queryFn: () => api<Lead[]>("/leads") });

  const mover = useMutation({
    mutationFn: ({ id, fase, posicao }: { id: string; fase: string; posicao: number }) =>
      api(`/leads/${id}`, { method: "PATCH", json: { fase, posicao } }),
    onSuccess: (l: any) => qc.setQueryData<Lead[]>(["leads"], (xs) => xs?.map((x) => x.id === l.id ? l : x)),
  });
  const criar = useMutation({
    mutationFn: (cnpj: string) => api("/leads", { method: "POST", json: { cnpj } }),
    onSuccess: () => { setNovoCnpj(""); qc.invalidateQueries({ queryKey: ["leads"] }); },
  });
  const criarFase = useMutation({
    mutationFn: (rotulo: string) => api("/funil", { method: "POST", json: { rotulo } }),
    onSuccess: () => { setNovaFase(""); qc.invalidateQueries({ queryKey: ["funil"] }); },
  });

  const visiveis = useMemo(() => {
    const t = filtro.trim().toLowerCase();
    return (leads.data ?? []).filter((l) => !t || l.nome.toLowerCase().includes(t) || (l.cnpj ?? "").includes(t.replace(/\D/g, "") || "§"));
  }, [leads.data, filtro]);

  const colunas = (funil.data ?? []).filter((f) => f.visivel).map((f) => ({ id: f.valor, titulo: f.rotulo, cor: f.cor }));
  const abrir = (id: string | null) => router.replace(id ? `/app/leads?lead=${id}` : "/app/leads", { scroll: false });

  return (
    <div className="p-5 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-0.5 text-sm text-aco">
            {leads.data ? <>{num(leads.data.length)} empresas no funil · {brl(leads.data.reduce((s, l) => s + Number(l.divida_total || 0), 0), true)} em dívida</> : "Carregando…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <MagnifyingGlass size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-aco" />
            <Campo className="h-8 w-48 pl-8 text-[13px]" placeholder="Filtrar" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
          </div>
          <div className="flex rounded-full border border-linha bg-papel p-0.5">
            {([["kanban", IconeKanban, "Kanban"], ["lista", ListBullets, "Lista"]] as const).map(([m, I, r]) => (
              <button key={m} type="button" onClick={() => setModo(m)} aria-pressed={modo === m}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[13px] ${modo === m ? "bg-acento-fundo font-medium" : "text-aco"}`}>
                <I size={14} /> {r}
              </button>
            ))}
          </div>
          <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (novoCnpj.trim()) criar.mutate(novoCnpj.trim()); }}>
            <Campo className="h-8 w-44 text-[13px]" placeholder="CNPJ para adicionar" value={novoCnpj} onChange={(e) => setNovoCnpj(e.target.value)} />
            <Botao type="submit" tamanho="p" variante="primario" disabled={criar.isPending}><Plus size={14} /> Lead</Botao>
          </form>
        </div>
      </header>
      {criar.error && <p className="mt-2 text-sm text-red-700">{(criar.error as any).message}</p>}
      <div className="mt-3"><AvisoErro erro={leads.error ?? funil.error} /></div>

      <div className="mt-4">
        {leads.isLoading || funil.isLoading ? (
          <div className="flex gap-3">{[0, 1, 2, 3].map((i) => <Esqueleto key={i} className="h-96 w-[290px]" />)}</div>
        ) : leads.data?.length === 0 ? (
          <Vazio titulo="Nenhum lead ainda"
            texto="Na Pesquisa, selecione empresas e clique em “Adicionar aos leads”, ou abra a ficha de uma empresa."
            acao={<Link href="/app/pesquisa" className="text-sm font-medium text-acento underline dark:text-acento-claro">Ir para a pesquisa</Link>} />
        ) : modo === "kanban" ? (
          <Kanban<Lead & { coluna: string }>
            colunas={colunas}
            itens={visiveis.map((l) => ({ ...l, coluna: l.fase }))}
            aoMover={(id, fase, posicao) => mover.mutateAsync({ id, fase, posicao })}
            aoClicar={(l) => abrir(l.id)}
            totalColuna={(_, xs) => xs.length ? brl(xs.reduce((s, l) => s + Number(l.divida_total || 0), 0), true) : null}
            renderCartao={(l) => (
              <div>
                <p className="line-clamp-2 font-medium leading-snug">{l.nome}</p>
                <p className="mt-1 text-xs text-aco">{[l.municipio, l.uf].filter(Boolean).join(" · ")}{l.tributo_principal && ` · ${l.tributo_principal}`}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-[13px] font-semibold tabular">{l.divida_total ? brl(Number(l.divida_total), true) : "—"}</span>
                  <span className="flex items-center gap-1 text-aco">
                    {l.telefones?.length > 0 && <Phone size={13} aria-label="tem telefone" />}
                    {l.emails?.length > 0 && <EnvelopeSimple size={13} aria-label="tem e-mail" />}
                  </span>
                </div>
                {l.proximo_passo && (
                  <p className="mt-2 flex items-center gap-1 rounded-md bg-fundo px-2 py-1 text-xs text-aco">
                    <CalendarBlank size={12} className="shrink-0" />
                    <span className="truncate">{l.proximo_em && <b className="font-medium text-tinta">{dataBr(l.proximo_em).slice(0, 5)} </b>}{l.proximo_passo}</span>
                  </p>
                )}
                {l.etiquetas?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{l.etiquetas.map((t) => <Selo key={t}>{t}</Selo>)}</div>}
              </div>
            )}
            depois={
              <form className="w-[220px] shrink-0" onSubmit={(e) => { e.preventDefault(); if (novaFase.trim()) criarFase.mutate(novaFase.trim()); }}>
                <Campo placeholder="+ Nova fase" value={novaFase} onChange={(e) => setNovaFase(e.target.value)} className="bg-transparent" />
              </form>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-linha bg-papel">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b border-linha text-left text-xs text-aco">
                <th className="px-4 py-2.5 font-medium">Empresa</th><th className="py-2.5 font-medium">Fase</th>
                <th className="py-2.5 font-medium">Próximo passo</th><th className="py-2.5 font-medium">Contato</th>
                <th className="px-4 py-2.5 text-right font-medium">Dívida</th>
              </tr></thead>
              <tbody>
                {visiveis.map((l) => {
                  const f = funil.data?.find((x) => x.valor === l.fase);
                  return (
                    <tr key={l.id} className="cursor-pointer border-b border-linha last:border-0 hover:bg-acento-fundo/40" onClick={() => abrir(l.id)}>
                      <td className="px-4 py-2.5"><p className="font-medium">{l.nome}</p><p className="text-xs text-aco">{[l.municipio, l.uf].filter(Boolean).join(" · ")}</p></td>
                      <td className="py-2.5"><span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${COR_FASE[f?.cor] ?? "bg-slate-400"}`} />{f?.rotulo ?? l.fase}</span></td>
                      <td className="py-2.5 text-aco">{l.proximo_passo ? `${l.proximo_em ? dataBr(l.proximo_em) + " · " : ""}${l.proximo_passo}` : "—"}</td>
                      <td className="py-2.5 text-aco">{l.telefones?.[0] ? telefoneFmt(l.telefones[0].valor) : l.emails?.[0]?.valor ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular">{l.divida_total ? brl(Number(l.divida_total), true) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <GavetaLead id={aberto} fases={funil.data ?? []} aoFechar={() => abrir(null)} />
    </div>
  );
}

function GavetaLead({ id, fases, aoFechar }: { id: string | null; fases: any[]; aoFechar: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["lead", id], queryFn: () => api(`/leads/${id}`), enabled: !!id });
  const l: any = q.data;
  const [novoTel, setNovoTel] = useState("");
  const [novaEtiqueta, setNovaEtiqueta] = useState("");

  const salvar = useMutation({
    mutationFn: (b: Record<string, unknown>) => api(`/leads/${id}`, { method: "PATCH", json: b }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lead", id] }); qc.invalidateQueries({ queryKey: ["leads"] }); qc.invalidateQueries({ queryKey: ["leads-resumo"] }); },
  });
  const enriquecer = useMutation({
    mutationFn: () => api("/leads/enriquecer", { method: "POST", json: { ids: [id] } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lead", id] }); qc.invalidateQueries({ queryKey: ["leads"] }); },
  });
  const apagar = useMutation({
    mutationFn: () => api(`/leads/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); aoFechar(); },
  });

  return (
    <Gaveta aberta={!!id} aoFechar={aoFechar} titulo={l?.nome ?? "Lead"}>
      {!l ? <div className="space-y-3 p-5"><Esqueleto className="h-8" /><Esqueleto className="h-40" /></div> : (
        <div key={l.id} className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-aco">
            {l.cnpj && <span className="font-mono tabular">{cnpjMascara(l.cnpj)}</span>}
            {l.cnpj && <Link href={`/app/empresas/${l.cnpj.trim()}`} className="inline-flex items-center gap-1 text-acento hover:underline dark:text-acento-claro">Ficha completa <ArrowSquareOut size={13} /></Link>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Rotulo>Fase</Rotulo>
              <Selecao value={l.fase} onChange={(e) => salvar.mutate({ fase: e.target.value })}>
                {fases.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
              </Selecao>
            </div>
            <div>
              <Rotulo>Dívida (na entrada)</Rotulo>
              <p className="flex h-9 items-center font-mono font-semibold tabular">{l.divida_total ? brl(Number(l.divida_total)) : "—"}</p>
            </div>
          </div>

          <div>
            <Rotulo>Próximo passo</Rotulo>
            <div className="grid grid-cols-[1fr_150px] gap-2">
              <Campo defaultValue={l.proximo_passo ?? ""} placeholder="Ex.: ligar para o sócio"
                onBlur={(e) => e.target.value !== (l.proximo_passo ?? "") && salvar.mutate({ proximo_passo: e.target.value || null })} />
              <Campo type="date" defaultValue={l.proximo_em ?? ""} onChange={(e) => salvar.mutate({ proximo_em: e.target.value || null })} />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Rotulo>Contatos</Rotulo>
              {l.cnpj && (
                <button type="button" onClick={() => enriquecer.mutate()} disabled={enriquecer.isPending}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs text-aco hover:text-tinta disabled:opacity-50">
                  <ArrowClockwise size={12} className={enriquecer.isPending ? "animate-spin" : ""} /> buscar no cadastro
                </button>
              )}
            </div>
            <ul className="space-y-1.5">
              {[...(l.telefones ?? []).map((t: any) => ({ ...t, tipo: "tel" })), ...(l.emails ?? []).map((t: any) => ({ ...t, tipo: "email" }))].map((c: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-linha px-3 py-1.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    {c.tipo === "tel" ? <Phone size={14} className="text-aco" /> : <EnvelopeSimple size={14} className="text-aco" />}
                    <a className="truncate hover:underline" href={c.tipo === "tel" ? `tel:+55${c.valor}` : `mailto:${c.valor}`}>
                      {c.tipo === "tel" ? telefoneFmt(c.valor) : c.valor}</a>
                    {c.provavel_contador && <Selo tom="alerta">contador?</Selo>}
                  </span>
                  <span className="flex items-center gap-1">
                    {c.tipo === "tel" && ehCelular(c.valor) && (
                      <a href={`https://wa.me/55${c.valor}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="rounded-full p-1 text-aco hover:bg-acento-fundo"><WhatsappLogo size={15} /></a>
                    )}
                    <button type="button" aria-label="Remover contato" className="cursor-pointer rounded-full p-1 text-aco hover:text-red-600"
                      onClick={() => salvar.mutate(c.tipo === "tel"
                        ? { telefones: l.telefones.filter((x: any) => x.valor !== c.valor) }
                        : { emails: l.emails.filter((x: any) => x.valor !== c.valor) })}><Trash size={13} /></button>
                  </span>
                </li>
              ))}
            </ul>
            {enriquecer.data && (enriquecer.data as any).com_contato === 0 && <p className="mt-1 text-xs text-aco">O cadastro não tem telefone nem e-mail para esta empresa.</p>}
            <form className="mt-2 flex gap-1.5" onSubmit={(e) => {
              e.preventDefault(); const v = novoTel.trim(); if (!v) return;
              const email = v.includes("@");
              salvar.mutate(email ? { emails: [...(l.emails ?? []), { valor: v.toLowerCase(), origem: "manual" }] }
                                  : { telefones: [...(l.telefones ?? []), { valor: v.replace(/\D/g, ""), origem: "manual" }] });
              setNovoTel("");
            }}>
              <Campo className="h-8 text-[13px]" placeholder="Telefone ou e-mail" value={novoTel} onChange={(e) => setNovoTel(e.target.value)} />
              <Botao type="submit" tamanho="p">Adicionar</Botao>
            </form>
          </div>

          <div>
            <Rotulo>Etiquetas</Rotulo>
            <div className="flex flex-wrap items-center gap-1.5">
              {(l.etiquetas ?? []).map((t: string) => (
                <button key={t} type="button" className="cursor-pointer" title="Remover"
                  onClick={() => salvar.mutate({ etiquetas: l.etiquetas.filter((x: string) => x !== t) })}><Selo tom="acento">{t} ×</Selo></button>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); const t = novaEtiqueta.trim(); if (t) { salvar.mutate({ etiquetas: [...(l.etiquetas ?? []), t] }); setNovaEtiqueta(""); } }}>
                <input className="h-6 w-28 rounded-full border border-dashed border-linha bg-transparent px-2 text-xs outline-none focus:border-acento"
                  placeholder="+ etiqueta" value={novaEtiqueta} onChange={(e) => setNovaEtiqueta(e.target.value)} />
              </form>
            </div>
          </div>

          <div>
            <Rotulo>Histórico</Rotulo>
            <ol className="space-y-1.5 border-l border-linha pl-3">
              {(l.eventos ?? []).map((e: any, i: number) => {
                const r = (v: string) => fases.find((f) => f.valor === v)?.rotulo ?? v;
                return (
                  <li key={i} className="text-xs text-aco">
                    <span className="font-mono tabular">{dataBr(e.aconteceu_em)}</span> · {e.tipo === "criado" ? "entrou no funil"
                      : e.tipo === "fase" ? <>de <b className="font-medium text-tinta">{r(e.propriedades.de)}</b> para <b className="font-medium text-tinta">{r(e.propriedades.para)}</b></> : e.tipo}
                    {e.autor_nome && <> · {e.autor_nome}</>}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="border-t border-linha pt-4">
            <Botao variante="perigo" tamanho="p" onClick={() => { if (confirm("Tirar esta empresa do funil?")) apagar.mutate(); }}>
              <Trash size={13} /> Tirar do funil
            </Botao>
          </div>
        </div>
      )}
    </Gaveta>
  );
}

export default function Leads() {
  return <Suspense><Conteudo /></Suspense>;
}
