"use client";
/**
 * Pesquisa de empresas devedoras. O estado dos filtros vive na URL: a
 * pesquisa pode ser copiada, salva, voltada com o botao do navegador e
 * aberta pelo painel ja filtrada.
 */
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookmarkSimple, CaretLeft, CaretRight, DownloadSimple, Funnel, MagnifyingGlass, Phone, EnvelopeSimple, Plus, Trash, Check,
} from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { brl, num, cnpjMascara, dataBr, posicao } from "@/lib/formato";
import { AvisoErro, Botao, Campo, Esqueleto, Rotulo, Selecao, Selo, Vazio } from "@/componentes/app/ui";
import { SeletorCidades } from "@/componentes/app/SeletorCidades";

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const CHAVES = ["q", "uf", "municipio", "valor_min", "valor_max", "tributo", "ajuizada", "contato", "cnae", "ativa", "desde", "ate", "ordem", "pagina",
  "regime", "porte", "socios_min", "socios_max", "capital_min", "capital_max"] as const;
const REGIMES = [["mei", "MEI"], ["simples", "Simples"], ["demais", "Fora do Simples"]] as const;
const PORTES = [["1", "ME"], ["3", "EPP"], ["5", "Demais"]] as const;
const ROTULO_REGIME: Record<string, string> = { mei: "MEI", simples: "Simples", demais: "fora do Simples" };
const ROTULO_PORTE: Record<string, string> = { 1: "ME", 3: "EPP", 5: "demais" };

/** Grupo de botoes liga/desliga que guarda a escolha como lista separada por virgula. */
function Alternancia({ opcoes, valor, aoMudar }: { opcoes: readonly (readonly [string, string])[]; valor: string; aoMudar: (v: string) => void }) {
  const sel = new Set(valor ? valor.split(",") : []);
  return (
    <div className="flex flex-wrap gap-1">
      {opcoes.map(([v, r]) => {
        const on = sel.has(v);
        return (
          <button key={v} type="button" aria-pressed={on}
            onClick={() => { on ? sel.delete(v) : sel.add(v); aoMudar([...sel].join(",")); }}
            className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${on ? "border-acento bg-acento text-white" : "border-linha bg-papel text-aco hover:border-acento"}`}>
            {r}
          </button>
        );
      })}
    </div>
  );
}

function Conteudo() {
  const router = useRouter();
  const sp = useSearchParams();
  const qc = useQueryClient();
  const filtros = useMemo(() => Object.fromEntries(CHAVES.map((k) => [k, sp.get(k) ?? ""])) as Record<string, string>, [sp]);
  const [rascunho, setRascunho] = useState(filtros);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [nomeBusca, setNomeBusca] = useState<string | null>(null);
  useEffect(() => setRascunho(filtros), [filtros]);

  const aplicar = (f: Record<string, string>, pagina = "") =>
    router.push(`/app/pesquisa${qs({ ...f, pagina })}`, { scroll: false });

  const res = useQuery({
    queryKey: ["devedores", filtros],
    queryFn: () => api(`/devedores${qs({ ...filtros, limite: 50 })}`),
    placeholderData: keepPreviousData,
  });
  const tributos = useQuery({ queryKey: ["tributos"], queryFn: () => api<any[]>("/devedores/tributos"), staleTime: 3600_000 });
  const buscas = useQuery({ queryKey: ["buscas"], queryFn: () => api<any[]>("/buscas") });

  const lote = useMutation({
    mutationFn: () => api("/leads/lote", { method: "POST", json: { cnpjs: [...sel] } }),
    onSuccess: (r: any) => {
      setMsg(`${r.criados} adicionadas aos leads${r.ignorados ? `, ${r.ignorados} já estavam lá` : ""}.`);
      setSel(new Set()); qc.invalidateQueries({ queryKey: ["devedores"] }); qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: any) => setMsg(e.message),
  });
  const estadual = useMutation({
    mutationFn: () => api("/divida-estadual/lote", { method: "POST", json: { cnpjs: [...sel] } }),
    onSuccess: (r: any) => setMsg(`Dívida estadual (SP e MG): ${r.com_debito} de ${r.consultas} consultas com débito, somando ${brl(r.valor_total, true)}.`),
    onError: (e: any) => setMsg(e.message),
  });
  const salvar = useMutation({
    mutationFn: (nome: string) => api("/buscas", { method: "POST", json: { nome, filtros: { ...filtros, pagina: "" } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buscas"] }),
  });
  const apagarBusca = useMutation({
    mutationFn: (id: string) => api(`/buscas/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buscas"] }),
  });

  const d: any = res.data;
  const pagina = Number(filtros.pagina || 1);
  const paginas = d ? Math.max(1, Math.ceil(d.total / d.limite)) : 1;
  const ufsSel = filtros.uf ? filtros.uf.split(",") : [];
  const r = (k: string, v: string) => setRascunho((x) => ({ ...x, [k]: v }));
  const todosSel = d?.itens?.length > 0 && d.itens.every((i: any) => sel.has(i.cnpj));

  return (
    <div className="mx-auto max-w-[1400px] p-5 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pesquisa</h1>
          <p className="mt-0.5 text-sm text-aco">Empresas com dívida ativa federal{d?.itens?.[0]?.data_referencia && <> · {posicao(d.itens[0].data_referencia)}</>}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao tamanho="p" className="lg:hidden" onClick={() => setFiltrosAbertos(!filtrosAbertos)}><Funnel size={14} /> Filtros</Botao>
          {nomeBusca === null ? (
            <Botao tamanho="p" onClick={() => setNomeBusca("")}><BookmarkSimple size={14} /> Salvar pesquisa</Botao>
          ) : (
            <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (nomeBusca.trim()) { salvar.mutate(nomeBusca.trim()); setNomeBusca(null); } }}>
              <Campo autoFocus className="h-8 w-48 text-[13px]" placeholder="Nome desta pesquisa" value={nomeBusca}
                onChange={(e) => setNomeBusca(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setNomeBusca(null)} />
              <Botao type="submit" tamanho="p" variante="primario">Salvar</Botao>
            </form>
          )}
          <a href={`/api/b/devedores.csv${qs(filtros)}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linha bg-papel px-3 text-[13px] font-medium hover:bg-acento-fundo">
            <DownloadSimple size={14} /> Exportar CSV
          </a>
        </div>
      </header>

      {/* Busca principal */}
      <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); aplicar(rascunho); }}>
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aco" />
          <Campo className="h-10 pl-9" placeholder="Razão social, nome fantasia ou CNPJ" value={rascunho.q}
            onChange={(e) => r("q", e.target.value)} aria-label="Buscar" />
        </div>
        <Botao type="submit" variante="primario" className="h-10">Buscar</Botao>
      </form>

      {buscas.data && buscas.data.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-aco">Salvas:</span>
          {buscas.data.map((b: any) => (
            <span key={b.id} className="inline-flex items-center rounded-full border border-linha bg-papel text-xs">
              <button type="button" className="cursor-pointer py-1 pl-2.5 pr-1.5 hover:text-acento" onClick={() => aplicar(b.filtros)}>{b.nome}</button>
              <button type="button" aria-label={`Apagar ${b.nome}`} className="cursor-pointer py-1 pr-2 text-aco hover:text-red-600"
                onClick={() => apagarBusca.mutate(b.id)}><Trash size={11} /></button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[250px_1fr]">
        {/* Filtros */}
        <aside className={`${filtrosAbertos ? "block" : "hidden"} space-y-4 lg:sticky lg:top-4 lg:block lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:pr-1`}>
          <div>
            <Rotulo>Estados</Rotulo>
            <div className="grid grid-cols-6 gap-1">
              {UFS.map((u) => {
                const ativo = (rascunho.uf ? rascunho.uf.split(",") : []).includes(u);
                return (
                  <button key={u} type="button"
                    onClick={() => {
                      const atual = new Set(rascunho.uf ? rascunho.uf.split(",") : []);
                      ativo ? atual.delete(u) : atual.add(u);
                      r("uf", [...atual].join(","));
                    }}
                    className={`cursor-pointer rounded-md border py-1 text-[11px] font-medium transition-colors ${ativo ? "border-acento bg-acento text-white" : "border-linha bg-papel text-aco hover:border-acento"}`}>
                    {u}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Rotulo>Cidades</Rotulo>
            <SeletorCidades valor={rascunho.municipio} aoMudar={(v) => r("municipio", v)}
              ufs={rascunho.uf ? rascunho.uf.split(",") : []} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Rotulo>Dívida mínima</Rotulo><Campo inputMode="numeric" placeholder="R$" value={rascunho.valor_min} onChange={(e) => r("valor_min", e.target.value.replace(/\D/g, ""))} /></div>
            <div><Rotulo>Dívida máxima</Rotulo><Campo inputMode="numeric" placeholder="R$" value={rascunho.valor_max} onChange={(e) => r("valor_max", e.target.value.replace(/\D/g, ""))} /></div>
          </div>
          <div>
            <Rotulo>Tributo</Rotulo>
            <Selecao value={rascunho.tributo} onChange={(e) => r("tributo", e.target.value)}>
              <option value="">Todos</option>
              {(tributos.data ?? []).map((t: any) => <option key={t.tributo} value={t.tributo}>{t.tributo} ({num(t.empresas)})</option>)}
            </Selecao>
          </div>
          <div>
            <Rotulo>Execução fiscal</Rotulo>
            <Selecao value={rascunho.ajuizada} onChange={(e) => r("ajuizada", e.target.value)}>
              <option value="">Tanto faz</option>
              <option value="nao">Ainda não ajuizada</option>
              <option value="sim">Já ajuizada</option>
            </Selecao>
          </div>
          <div>
            <Rotulo>Regime tributário</Rotulo>
            <Alternancia opcoes={REGIMES} valor={rascunho.regime} aoMudar={(v) => r("regime", v)} />
          </div>
          <div>
            <Rotulo>Porte</Rotulo>
            <Alternancia opcoes={PORTES} valor={rascunho.porte} aoMudar={(v) => r("porte", v)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Rotulo>Sócios, mín.</Rotulo><Campo inputMode="numeric" value={rascunho.socios_min} onChange={(e) => r("socios_min", e.target.value.replace(/\D/g, ""))} /></div>
            <div><Rotulo>Sócios, máx.</Rotulo><Campo inputMode="numeric" value={rascunho.socios_max} onChange={(e) => r("socios_max", e.target.value.replace(/\D/g, ""))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Rotulo>Capital mín.</Rotulo><Campo inputMode="numeric" placeholder="R$" value={rascunho.capital_min} onChange={(e) => r("capital_min", e.target.value.replace(/\D/g, ""))} /></div>
            <div><Rotulo>Capital máx.</Rotulo><Campo inputMode="numeric" placeholder="R$" value={rascunho.capital_max} onChange={(e) => r("capital_max", e.target.value.replace(/\D/g, ""))} /></div>
          </div>
          <div>
            <Rotulo>Contato na base</Rotulo>
            <Selecao value={rascunho.contato} onChange={(e) => r("contato", e.target.value)}>
              <option value="">Tanto faz</option>
              <option value="qualquer">Telefone ou e-mail</option>
              <option value="telefone">Com telefone</option>
              <option value="email">Com e-mail</option>
            </Selecao>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Rotulo>Inscrita desde</Rotulo><Campo inputMode="numeric" placeholder="ano" maxLength={4} value={rascunho.desde} onChange={(e) => r("desde", e.target.value.replace(/\D/g, ""))} /></div>
            <div><Rotulo>até</Rotulo><Campo inputMode="numeric" placeholder="ano" maxLength={4} value={rascunho.ate} onChange={(e) => r("ate", e.target.value.replace(/\D/g, ""))} /></div>
          </div>
          <div><Rotulo>CNAE (início do código)</Rotulo><Campo inputMode="numeric" placeholder="ex.: 47" value={rascunho.cnae} onChange={(e) => r("cnae", e.target.value.replace(/\D/g, ""))} /></div>
          <div>
            <Rotulo>Ordenar por</Rotulo>
            <Selecao value={rascunho.ordem} onChange={(e) => r("ordem", e.target.value)}>
              <option value="">Maior dívida</option>
              <option value="valor_asc">Menor dívida</option>
              <option value="ajuizado">Maior valor ajuizado</option>
              <option value="inscricoes">Mais inscrições</option>
              <option value="antigas">Dívida mais antiga</option>
              <option value="recentes">Inscrição mais recente</option>
              <option value="capital">Maior capital social</option>
              <option value="socios">Mais sócios</option>
              <option value="nome">Nome</option>
            </Selecao>
          </div>
          <div className="sticky bottom-0 flex gap-2 bg-fundo pb-1 pt-2">
            <Botao variante="primario" className="flex-1" onClick={() => aplicar(rascunho)}>Aplicar</Botao>
            <Botao variante="fantasma" onClick={() => aplicar({} as any)}>Limpar</Botao>
          </div>
        </aside>

        {/* Resultados */}
        <section className="min-w-0">
          <AvisoErro erro={res.error} />
          <div className="mb-2 flex min-h-9 flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-aco">
              {d ? <>
                <span className="font-semibold text-tinta">{d.total_excede ? "Mais de 100 mil" : num(d.total)}</span> empresas
                {d.soma_valor != null && <> · {brl(d.soma_valor, true)}</>}
                {ufsSel.length > 0 && <> · {ufsSel.join(", ")}</>}
              </> : "Carregando…"}
            </p>
            {sel.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm">{sel.size} selecionadas</span>
                <Botao tamanho="p" disabled={estadual.isPending || sel.size > 100} onClick={() => estadual.mutate()}
                  title={sel.size > 100 ? "Até 100 por vez" : "Consulta a dívida ativa de SP e MG pelo CNPJ"}>
                  {estadual.isPending ? "Consultando…" : "Dívida estadual"}
                </Botao>
                <Botao tamanho="p" variante="primario" disabled={lote.isPending} onClick={() => lote.mutate()}>
                  <Plus size={14} /> Adicionar aos leads
                </Botao>
              </div>
            )}
          </div>
          {msg && <p className="mb-2 rounded-lg bg-acento-fundo px-3 py-2 text-sm" role="status">{msg}</p>}

          <div className="overflow-x-auto rounded-[10px] border border-linha bg-papel">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-linha text-left text-xs text-aco">
                  <th className="w-10 px-3 py-2.5">
                    <input type="checkbox" aria-label="Selecionar página" checked={todosSel}
                      onChange={() => setSel((s) => { const n = new Set(s); d?.itens?.forEach((i: any) => todosSel ? n.delete(i.cnpj) : n.add(i.cnpj)); return n; })} />
                  </th>
                  <th className="py-2.5 font-medium">Empresa</th>
                  <th className="py-2.5 pr-3 font-medium">Local</th>
                  <th className="py-2.5 pr-3 font-medium">Tributo</th>
                  <th className="py-2.5 text-right font-medium">Inscrições</th>
                  <th className="px-4 py-2.5 text-right font-medium">Dívida</th>
                </tr>
              </thead>
              <tbody className={res.isPlaceholderData ? "opacity-60" : ""}>
                {res.isLoading && Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-linha"><td colSpan={6} className="px-4 py-3"><Esqueleto className="h-8" /></td></tr>
                ))}
                {d?.itens?.map((e: any) => (
                  <tr key={e.cnpj_raiz} className="border-b border-linha last:border-0 hover:bg-acento-fundo/40">
                    <td className="px-3 py-2.5 align-top">
                      <input type="checkbox" aria-label={`Selecionar ${e.nome}`} checked={sel.has(e.cnpj)}
                        onChange={() => setSel((s) => { const n = new Set(s); n.has(e.cnpj) ? n.delete(e.cnpj) : n.add(e.cnpj); return n; })} />
                    </td>
                    <td className="py-2.5 pr-3 align-top">
                      <Link href={`/app/empresas/${e.cnpj}`} className="font-medium hover:text-acento hover:underline dark:hover:text-acento-claro">{e.nome}</Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-aco">
                        <span className="font-mono tabular">{cnpjMascara(e.cnpj)}</span>
                        {e.telefone && <Phone size={12} aria-label="tem telefone" />}
                        {e.email && <EnvelopeSimple size={12} aria-label="tem e-mail" />}
                        {e.regime && <Selo>{ROTULO_REGIME[e.regime]}</Selo>}
                        {e.porte && ROTULO_PORTE[e.porte] && <Selo>{ROTULO_PORTE[e.porte]}</Selo>}
                        {e.qtd_socios != null && <span>{e.qtd_socios} sócio{e.qtd_socios == 1 ? "" : "s"}</span>}
                        {e.tem_ajuizada && <Selo tom="alerta">ajuizada</Selo>}
                        {e.e_lead && <Selo tom="acento"><Check size={10} /> lead</Selo>}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 align-top text-aco">{[e.municipio, e.uf].filter(Boolean).join(" · ") || e.uf}</td>
                    <td className="py-2.5 pr-3 align-top text-aco">{e.tributo_principal}</td>
                    <td className="py-2.5 text-right align-top font-mono tabular text-aco">
                      {num(e.qtd_inscricoes)}
                      <div className="text-[11px]">desde {dataBr(e.inscricao_mais_antiga).slice(-4)}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right align-top font-mono font-semibold tabular">{brl(e.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {d && d.itens.length === 0 && <div className="p-5"><Vazio titulo="Nenhuma empresa com esses filtros" texto="Afrouxe algum filtro ou limpe a busca." /></div>}
          </div>

          {d && d.total > d.limite && (
            <nav className="mt-3 flex items-center justify-between text-sm" aria-label="Paginação">
              <span className="text-aco">Página {pagina} de {d.total_excede ? "muitas" : num(paginas)}</span>
              <div className="flex gap-2">
                <Botao tamanho="p" disabled={pagina <= 1} onClick={() => aplicar(filtros, String(pagina - 1))}><CaretLeft size={14} /> Anterior</Botao>
                <Botao tamanho="p" disabled={!d.total_excede && pagina >= paginas} onClick={() => aplicar(filtros, String(pagina + 1))}>Próxima <CaretRight size={14} /></Botao>
              </div>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}

export default function Pesquisa() {
  return <Suspense><Conteudo /></Suspense>;
}
