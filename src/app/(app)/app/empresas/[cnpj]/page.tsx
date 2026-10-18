"use client";
/**
 * Ficha da empresa: a divida (inscricao por inscricao), o cadastro, os
 * contatos, os socios e os cruzamentos, e o que o escritorio ja fez com
 * ela (lead, notas). E a tela que o advogado abre antes de ligar.
 */
import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowClockwise, ArrowLeft, Copy, EnvelopeSimple, NotePencil, Phone, Plus, WhatsappLogo, Warning, Kanban,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { brl, num, cnpjMascara, dataBr, desde, telefoneFmt, ehCelular, posicao } from "@/lib/formato";
import { AvisoErro, Botao, Esqueleto, Selo, Superficie, Vazio } from "@/componentes/app/ui";
import { PesquisaInternet } from "@/componentes/app/PesquisaInternet";
import { HistoricoDivida } from "@/componentes/app/HistoricoDivida";

export default function Ficha({ params }: { params: Promise<{ cnpj: string }> }) {
  const { cnpj } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [aba, setAba] = useState<"inscricoes" | "socios" | "grupo">("inscricoes");
  const f = useQuery({ queryKey: ["empresa", cnpj], queryFn: () => api(`/empresas/${cnpj}`) });
  const d: any = f.data;

  const virarLead = useMutation({
    mutationFn: () => api("/leads", { method: "POST", json: { cnpj: d?.cnpj ?? cnpj } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["empresa", cnpj] }); qc.invalidateQueries({ queryKey: ["leads"] }); },
  });
  const atualizar = useMutation({
    mutationFn: () => api(`/empresas/${d?.cnpj ?? cnpj}/cadastro`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["empresa", cnpj] }),
  });
  const novaNota = useMutation({
    mutationFn: () => api("/notas", { method: "POST", json: { titulo: `Notas · ${d?.devedor?.nome ?? d?.cadastro?.razao_social ?? cnpj}`, cnpj: d?.cnpj ?? cnpj } }),
    onSuccess: (n: any) => router.push(`/app/notas?pagina=${n.id}`),
  });

  if (f.isLoading) return <div className="mx-auto max-w-[1200px] space-y-4 p-5 md:p-8"><Esqueleto className="h-16" /><Esqueleto className="h-40" /><Esqueleto className="h-80" /></div>;
  if (f.error) return <div className="p-5 md:p-8"><AvisoErro erro={f.error} /></div>;

  const dev = d.devedor;
  const cad = d.cadastro;
  const nome = dev?.nome ?? cad?.razao_social ?? cnpjMascara(cnpj);
  const contatos: any[] = cad?.contatos ?? [];
  const end = cad?.endereco;

  return (
    <div className="mx-auto max-w-[1200px] p-5 md:p-8">
      <button type="button" onClick={() => router.back()} className="mb-3 inline-flex cursor-pointer items-center gap-1 text-sm text-aco hover:text-tinta">
        <ArrowLeft size={14} /> Voltar
      </button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{nome}</h1>
          {cad?.nome_fantasia && cad.nome_fantasia !== nome && <p className="text-sm text-aco">{cad.nome_fantasia}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-aco">
            <button type="button" className="inline-flex cursor-pointer items-center gap-1 font-mono tabular hover:text-tinta"
              onClick={() => navigator.clipboard?.writeText(d.cnpj ?? cnpj)} title="Copiar CNPJ">
              {cnpjMascara(d.cnpj ?? cnpj)} <Copy size={12} />
            </button>
            {(end?.municipio || dev?.uf) && <span>· {[end?.municipio ?? dev?.municipio, end?.uf ?? dev?.uf].filter(Boolean).join(" / ")}</span>}
            {cad?.situacao && <Selo tom={/ativa/i.test(cad.situacao) ? "ok" : "perigo"}>{cad.situacao}</Selo>}
            {dev?.tem_ajuizada && <Selo tom="alerta">execução fiscal</Selo>}
            {dev?.regime && <Selo>{({ mei: "MEI", simples: "Simples Nacional", demais: "Fora do Simples" } as any)[dev.regime]}</Selo>}
            {dev?.qtd_socios != null && <Selo>{dev.qtd_socios} sócio{dev.qtd_socios == 1 ? "" : "s"}</Selo>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {d.lead ? (
            <Link href={`/app/leads?lead=${d.lead.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-acento-fundo px-4 text-sm font-medium text-acento dark:text-acento-claro">
              <Kanban size={15} /> No funil · {d.lead.fase.toLowerCase()}
            </Link>
          ) : (
            <Botao variante="primario" disabled={virarLead.isPending} onClick={() => virarLead.mutate()}>
              <Plus size={15} /> Adicionar aos leads
            </Botao>
          )}
          <Botao disabled={novaNota.isPending} onClick={() => novaNota.mutate()}><NotePencil size={15} /> Nova nota</Botao>
        </div>
      </header>

      {/* Numeros da divida */}
      {dev && (
        <div className="mt-5 grid gap-px overflow-hidden rounded-[10px] border border-linha bg-linha sm:grid-cols-4">
          {[
            ["Dívida total", brl(dev.valor_total), posicao(dev.data_referencia)],
            ["Ajuizada", brl(dev.valor_ajuizado), Number(dev.valor_ajuizado) > 0 ? "em execução fiscal" : "nada ajuizado"],
            ["Inscrições", num(dev.qtd_inscricoes), (dev.tributos ?? []).join(", ")],
            ["Mais antiga", dataBr(dev.inscricao_mais_antiga), desde(dev.inscricao_mais_antiga)],
          ].map(([r, v, x]) => (
            <div key={r} className="bg-papel px-5 py-4">
              <p className="text-xs text-aco">{r}</p>
              <p className="mt-1 font-mono text-lg font-semibold tabular">{v}</p>
              <p className="mt-0.5 truncate text-xs text-aco">{x}</p>
            </div>
          ))}
        </div>
      )}

      {d.programas?.length > 0 && <ComoRegularizar programas={d.programas} />}

      <div className="mt-4"><HistoricoDivida cnpj={d.cnpj ?? cnpj} /></div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          {/* Abas */}
          <Superficie>
            <div className="flex gap-1 border-b border-linha px-3 pt-2" role="tablist">
              {([["inscricoes", `Inscrições (${d.inscricoes.length})`], ["socios", `Sócios (${cad?.socios?.length ?? 0})`],
                 ["grupo", `Cruzamentos (${d.socios_devedores.length + d.grupo_economico.length})`]] as const).map(([k, r]) => (
                <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => setAba(k)}
                  className={`cursor-pointer border-b-2 px-3 py-2 text-sm ${aba === k ? "border-acento font-medium text-tinta" : "border-transparent text-aco hover:text-tinta"}`}>
                  {r}
                </button>
              ))}
            </div>

            {aba === "inscricoes" && (
              d.inscricoes.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead><tr className="border-b border-linha text-left text-xs text-aco">
                      <th className="px-4 py-2 font-medium">Inscrição</th><th className="py-2 font-medium">Tributo / receita</th>
                      <th className="py-2 font-medium">Situação</th><th className="py-2 font-medium">Inscrita em</th>
                      <th className="px-4 py-2 text-right font-medium">Valor</th>
                    </tr></thead>
                    <tbody>
                      {d.inscricoes.map((i: any, n: number) => (
                        <tr key={`${i.numero_inscricao}-${n}`} className="border-b border-linha last:border-0">
                          <td className="px-4 py-2 font-mono text-xs tabular">{i.numero_inscricao}
                            {i.tipo_devedor !== 1 && <div><Selo>{i.tipo_devedor === 3 ? "solidária" : "corresponsável"}</Selo></div>}
                          </td>
                          <td className="py-2 pr-3">{i.tributo}<div className="text-xs text-aco">{i.receita_principal}</div></td>
                          <td className="py-2 pr-3 text-xs">{i.situacao}{i.ajuizado && <div><Selo tom="alerta">ajuizada</Selo></div>}</td>
                          <td className="py-2 pr-3 font-mono text-xs tabular">{dataBr(i.data_inscricao)}</td>
                          <td className="px-4 py-2 text-right font-mono tabular">{brl(i.valor_consolidado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="p-4"><Vazio titulo="Sem inscrições em dívida ativa federal" texto="Esta empresa não aparece na base atual da PGFN." /></div>
            )}

            {aba === "socios" && (
              cad?.socios?.length ? (
                <ul className="divide-y divide-linha">
                  {cad.socios.map((s: any, n: number) => {
                    const deve = d.socios_devedores.find((x: any) => x.nome?.toUpperCase() === s.nome?.toUpperCase());
                    return (
                      <li key={n} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                        <div>
                          <p className="font-medium">{s.nome}</p>
                          <p className="text-xs text-aco">{[s.qualificacao, s.faixa_etaria, s.entrada && `desde ${dataBr(s.entrada)}`, s.documento].filter(Boolean).join(" · ")}</p>
                        </div>
                        {deve && <Selo tom="perigo">deve {brl(deve.valor_total, true)} como pessoa física</Selo>}
                      </li>
                    );
                  })}
                </ul>
              ) : <div className="p-4"><Vazio titulo="Quadro societário indisponível" texto="Nem a carga da Receita nem a consulta por CNPJ trouxeram sócios para esta empresa." /></div>
            )}

            {aba === "grupo" && (
              <div className="space-y-4 p-4">
                <div>
                  <h3 className="text-sm font-semibold">Sócios com dívida própria</h3>
                  {d.socios_devedores.length ? (
                    <ul className="mt-2 divide-y divide-linha rounded-lg border border-linha">
                      {d.socios_devedores.map((s: any, n: number) => (
                        <li key={n} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                          <span>{s.nome} <span className="text-xs text-aco">· {s.uf} · {s.documento}</span>
                            {s.confianca !== "alta" && <Selo tom="alerta" className="ml-1">conferir: nome curto</Selo>}</span>
                          <span className="font-mono tabular">{brl(s.valor_total, true)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-1 text-sm text-aco">Nenhum sócio desta empresa aparece como devedor pessoa física.</p>}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Outras empresas devedoras dos mesmos sócios</h3>
                  {d.grupo_economico.length ? (
                    <ul className="mt-2 divide-y divide-linha rounded-lg border border-linha">
                      {d.grupo_economico.map((g: any) => (
                        <li key={g.cnpj_raiz}>
                          <Link href={`/app/empresas/${g.cnpj}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-acento-fundo/40">
                            <span className="min-w-0"><span className="block truncate font-medium">{g.nome}</span>
                              <span className="block truncate text-xs text-aco">via {g.socios_em_comum.join(", ")} · {g.uf}</span></span>
                            <span className="shrink-0 font-mono tabular">{brl(g.valor_total, true)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-1 text-sm text-aco">Nenhuma outra empresa devedora com sócio em comum na base carregada.</p>}
                </div>
                <p className="flex gap-1.5 text-xs text-aco"><Warning size={14} className="shrink-0" /> {d.avisos.socios}</p>
              </div>
            )}
          </Superficie>
        </div>

        {/* Lateral: contato e cadastro */}
        <div className="space-y-4">
          <Superficie titulo="Contato" acao={
            <button type="button" disabled={atualizar.isPending} onClick={() => atualizar.mutate()}
              className="inline-flex cursor-pointer items-center gap-1 text-xs text-aco hover:text-tinta disabled:opacity-50" title="Consultar de novo na fonte">
              <ArrowClockwise size={12} className={atualizar.isPending ? "animate-spin" : ""} /> atualizar
            </button>}>
            <div className="space-y-2 p-4">
              {contatos.length === 0 && <p className="text-sm text-aco">Nenhum telefone ou e-mail no cadastro da Receita.</p>}
              {contatos.map((c) => (
                <div key={c.valor} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    {c.tipo === "telefone" ? <Phone size={15} className="shrink-0 text-aco" /> : <EnvelopeSimple size={15} className="shrink-0 text-aco" />}
                    <a href={c.tipo === "telefone" ? `tel:+55${c.valor}` : `mailto:${c.valor}`} className="truncate hover:underline">
                      {c.tipo === "telefone" ? telefoneFmt(c.valor) : c.valor}
                    </a>
                    {c.provavel_contador && <Selo tom="alerta">provável contador</Selo>}
                  </span>
                  {c.tipo === "telefone" && ehCelular(c.valor) && (
                    <a href={`https://wa.me/55${c.valor}`} target="_blank" rel="noopener noreferrer" aria-label="Abrir no WhatsApp"
                      className="rounded-full p-1.5 text-aco hover:bg-acento-fundo hover:text-tinta"><WhatsappLogo size={16} /></a>
                  )}
                </div>
              ))}
              <p className="pt-1 text-[11px] leading-relaxed text-aco">{d.avisos.contatos}</p>
              {atualizar.error && <p className="text-xs text-red-700">{(atualizar.error as any).message}</p>}
            </div>
          </Superficie>

          {(d.cnpj ?? cnpj).length === 14 && <PesquisaInternet cnpj={d.cnpj ?? cnpj} temLead={!!d.lead} />}

          {d.estadual_sp?.length > 0 && (
            <Superficie titulo="Dívida estadual em SP" acao={<span className="text-xs text-aco">transação PGE-SP</span>}>
              <ul className="divide-y divide-linha">
                {d.estadual_sp.map((t: any, i: number) => (
                  <li key={i} className="px-4 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{t.tipo_debito || t.edital}</span>
                      <span className="font-mono tabular">{brl(t.valor_sem_beneficio ?? t.valor_com_beneficio)}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-aco">
                      <Selo tom={/rompido/i.test(t.status) ? "perigo" : /pago/i.test(t.status) ? "ok" : "alerta"}>{t.status}</Selo>
                      {t.qtd_debitos && <span>{t.qtd_debitos} débito(s)</span>}
                      {t.data_solicitacao && <span>· adesão {dataBr(t.data_solicitacao)}</span>}
                      <span>· {t.edital}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="border-t border-linha px-4 py-2 text-[11px] leading-relaxed text-aco">
                Quem aderiu à transação da PGE-SP, base publicada pelo Estado (posição {dataBr(d.estadual_sp[0].posicao)}). SP não publica a lista completa de devedores; o resto só por consulta de CNPJ.
              </p>
            </Superficie>
          )}

          <DividaEstadual cnpj={d.cnpj ?? cnpj} ufSugerida={end?.uf ?? dev?.uf} />

          {cad && (
            <Superficie titulo="Cadastro">
              <dl className="divide-y divide-linha text-sm">
                {[
                  ["Atividade", cad.cnae ? `${cad.cnae.codigo} ${cad.cnae.descricao ?? ""}` : null],
                  ["Natureza", cad.natureza_juridica],
                  ["Porte", cad.porte],
                  ["Capital social", cad.capital_social != null ? brl(cad.capital_social) : null],
                  ["Abertura", cad.data_abertura ? `${dataBr(cad.data_abertura)} (${desde(cad.data_abertura)})` : null],
                  ["Simples", cad.simples == null ? null : cad.simples ? (cad.mei ? "Sim, MEI" : "Sim") : "Não"],
                  ["Endereço", end ? [end.logradouro, end.numero, end.complemento, end.bairro, end.cep && `CEP ${end.cep}`].filter(Boolean).join(", ") : null],
                ].filter(([, v]) => v).map(([r, v]) => (
                  <div key={r as string} className="grid grid-cols-[96px_1fr] gap-2 px-4 py-2">
                    <dt className="text-xs text-aco">{r}</dt><dd className="text-[13px]">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-linha px-4 py-2 text-[11px] text-aco">
                Fonte: {cad.fonte === "receita_carga" ? "carga mensal da Receita" : cad.fonte === "brasilapi" ? "BrasilAPI (cadastro da Receita)" : "CNPJ.ws"} · {dataBr(cad.consultado_em)}
              </p>
            </Superficie>
          )}

          <Superficie titulo="Notas" acao={<button type="button" onClick={() => novaNota.mutate()} className="cursor-pointer text-xs text-acento hover:underline dark:text-acento-claro">+ nova</button>}>
            {d.notas.length ? (
              <ul className="divide-y divide-linha">
                {d.notas.map((n: any) => (
                  <li key={n.id}><Link href={`/app/notas?pagina=${n.id}`} className="block px-4 py-2 text-sm hover:bg-acento-fundo/40">
                    {n.icone ?? "📄"} {n.titulo || "Sem título"}<span className="block text-xs text-aco">editada {dataBr(n.atualizado_em)}</span>
                  </Link></li>
                ))}
              </ul>
            ) : <p className="px-4 py-3 text-sm text-aco">Nenhuma nota sobre esta empresa.</p>}
          </Superficie>
        </div>
      </div>
    </div>
  );
}

/**
 * Divida ativa ESTADUAL (SP e MG), sob demanda: os estados nao publicam
 * lista para download, so consulta por CNPJ. Cada consulta tem custo, por
 * isso e por clique e fica em cache de 30 dias no servidor.
 */
function DividaEstadual({ cnpj, ufSugerida }: { cnpj: string; ufSugerida?: string | null }) {
  const [uf, setUf] = useState<"SP" | "MG" | null>(null);
  const q = useQuery({
    queryKey: ["estadual", cnpj, uf],
    queryFn: () => api(`/empresas/${cnpj}/divida-estadual/${uf}`),
    enabled: !!uf, staleTime: Infinity, retry: false,
  });
  const r: any = q.data;
  return (
    <Superficie titulo="Dívida ativa estadual">
      <div className="space-y-3 p-4 text-sm">
        <div className="flex gap-2">
          {(["SP", "MG"] as const).map((u) => (
            <Botao key={u} tamanho="p" variante={uf === u ? "primario" : "secundario"} onClick={() => setUf(u)}>
              Consultar {u}{ufSugerida === u ? " ·" : ""}
            </Botao>
          ))}
        </div>
        {q.isFetching && <Esqueleto className="h-10" />}
        {q.error && <p className="text-red-700">{(q.error as any).message}</p>}
        {r && !q.isFetching && (
          r.indisponivel ? (
            <p className="text-aco">{r.indisponivel === "Consulta estadual não configurada."
              ? "A consulta estadual precisa do token da Infosimples configurado no servidor."
              : r.indisponivel}</p>
          ) : r.tem_debito ? (
            <p><span className="font-mono font-semibold tabular">{brl(r.valor_total)}</span> em {num(r.quantidade)} inscrição(ões) na dívida ativa de {r.uf}
              <span className="block text-xs text-aco">consultado em {dataBr(r.consultado_em)}{r.cache ? " (cache)" : ""}</span></p>
          ) : <p>Nada inscrito na dívida ativa de {r.uf}. <span className="text-xs text-aco">{dataBr(r.consultado_em)}</span></p>
        )}
        {!uf && <p className="text-xs leading-relaxed text-aco">SP e MG não publicam a lista de devedores; a consulta é por CNPJ, feita quando você clica.</p>}
      </div>
    </Superficie>
  );
}

/** Programas de transacao/parcelamento que cabem para esta empresa (triagem). */
function ComoRegularizar({ programas }: { programas: any[] }) {
  const ORG: Record<string, string> = { PGFN: "PGFN", PGE_SP: "PGE-SP", AGE_MG: "AGE-MG" };
  return (
    <section className="mt-4 rounded-[10px] border border-linha bg-papel">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-linha px-4 py-3">
        <h2 className="text-sm font-semibold">Como regularizar</h2>
        <Link href="/app/acordos" className="text-xs text-acento hover:underline dark:text-acento-claro">todos os acordos e parcelamentos</Link>
      </header>
      <ul className="divide-y divide-linha">
        {programas.map((p) => (
          <li key={p.slug} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="font-medium">{p.nome} <span className="text-xs font-normal text-aco">· {ORG[p.orgao]}</span></p>
              <p className="mt-0.5 text-xs text-aco">
                {p.estado === "aberto" ? <b className="font-medium text-amber-800 dark:text-amber-300">adesão até {dataBr(p.adesao_fim)} ({p.dias} dias)</b> : "disponível a qualquer tempo"}
                {p.motivos?.length > 0 && <> · {p.motivos.join(" · ")}</>}
              </p>
              {p.confirmar?.length > 0 && <p className="mt-0.5 flex items-start gap-1 text-xs text-aco"><Warning size={12} className="mt-0.5 shrink-0" /> {p.confirmar.join(" · ")}</p>}
            </div>
            {p.desconto_teto_valor != null && (
              <div className="text-right">
                <p className="font-mono font-semibold tabular">até {brl(p.desconto_teto_valor, true)}</p>
                <p className="text-[11px] text-aco">teto de {Math.round(p.desconto_teto * 100)}% sobre {brl(p.valor_abrangido, true)}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="border-t border-linha px-4 py-2 text-[11px] text-aco">Triagem com o dado público. O teto é o limite legal; o desconto efetivo depende da classificação do devedor e do edital.</p>
    </section>
  );
}
