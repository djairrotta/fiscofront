"use client";
/**
 * Pesquisa de empresas: todas as empresas do Brasil (base completa da
 * Receita), com os filtros de cadastro, localização, perfil, contato,
 * dívida federal e momento da dívida. Os filtros vivem na URL; a prévia
 * conta o resultado enquanto o usuário ajusta, antes de buscar.
 */
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookmarkSimple, CaretDown, CaretLeft, CaretRight, ChartBar, Check, Copy, DownloadSimple, EnvelopeSimple, Funnel,
  Lightning, MagnifyingGlass, MapPin, Phone, Plus, Trash, Users, WhatsappLogo, X,
} from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { brl, cnpjMascara, dataBr, desde, ehCelular, num, telefoneFmt } from "@/lib/formato";
import { AvisoErro, Botao, Campo, Esqueleto, Rotulo, Selecao, Selo, Vazio } from "@/componentes/app/ui";
import { SeletorCidades } from "@/componentes/app/SeletorCidades";
import { SeletorCnae } from "@/componentes/app/SeletorCnae";

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const CHAVES_BUSCA = [
  "q", "email", "telefone", "secao", "cnae", "cnae_secundario", "uf", "municipio", "bairro", "cep", "logradouro", "numero",
  "raio_km", "raio_municipio", "hab_min", "hab_max", "situacao", "situacao_de", "situacao_ate", "matriz", "filiais_min",
  "natureza", "abertura_de", "abertura_ate", "idade_min", "idade_max", "porte", "mei", "simples", "regime", "faturamento",
  "capital_min", "capital_max", "socios_min", "socios_max", "contato", "ocultar_contador", "recuperacao",
  "divida", "valor_min", "valor_max", "tributo", "ajuizada", "acordo", "sinal", "programa", "estadual", "ordem", "pagina",
] as const;

const SITUACOES = [["2", "Ativa"], ["8", "Baixada"], ["3", "Suspensa"], ["4", "Inapta"], ["1", "Nula"]] as const;
const ROT_SIT: Record<string, string> = { 1: "nula", 2: "ativa", 3: "suspensa", 4: "inapta", 8: "baixada" };
const PORTES = [["1", "ME"], ["3", "EPP"], ["5", "Demais"]] as const;
const ROT_PORTE: Record<string, string> = { 1: "ME", 3: "EPP", 5: "Demais" };
const REGIMES = [["mei", "MEI"], ["simples", "Simples"], ["demais", "Fora do Simples"]] as const;
const FATURAMENTO = [["ate81k", "Até R$ 81 mil (MEI)"], ["ate360k", "Até R$ 360 mil (ME)"], ["ate4800k", "Até R$ 4,8 mi (EPP)"], ["acima", "Acima de R$ 4,8 mi"]] as const;
const GRUPOS_NATUREZA = [["g:empresario", "Empresário individual"], ["g:sociedade", "Sociedade (Ltda, S/A…)"], ["g:sem_fins", "Sem fins lucrativos"], ["g:publica", "Pública"]] as const;
const CONTATOS = [["email", "E-mail"], ["telefone", "Telefone"], ["celular", "Celular"], ["fixo", "Fixo"], ["site", "Site"]] as const;
const SINAIS = [["nova_tri", "Inscrição nova no trimestre"], ["nova_12m", "Inscrição nova em 12 meses"],
  ["rescindiu", "Acordo caiu"], ["negociou", "Negociou no trimestre"], ["ajuizou", "Ajuizada no trimestre"],
  ["cresceu", "Dívida cresceu 10%+"], ["caiu", "Dívida caiu 10%+"], ["quitou", "Quitou inscrições"], ["recorrente", "Devedora há 2+ anos"]] as const;
const ORDENS = [["contatos", "Melhores contatos"], ["recentes", "Abertas mais recentemente"], ["antigas", "Mais antigas"],
  ["capital_desc", "Maior capital social"], ["capital_asc", "Menor capital social"], ["divida", "Maior dívida federal"],
  ["razao", "Razão social (A-Z)"], ["municipio", "Município"], ["situacao", "Mudança de situação mais recente"]] as const;

const hoje = () => new Date().toISOString().slice(0, 10);
const diasAtras = (d: number) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);

/** Pesquisas prontas (o "Pesquisa rápida"), pensadas para contador e gestor. */
const RAPIDAS: { rotulo: string; dica: string; f: Record<string, string> }[] = [
  { rotulo: "Abertas nos últimos 30 dias", dica: "Empresa nova precisa de contador", f: { abertura_de: diasAtras(30), ordem: "recentes" } },
  { rotulo: "Excluídas do Simples", dica: "Perderam o regime e precisam rever tudo", f: { simples: "excluido" } },
  { rotulo: "MEI desenquadrados", dica: "Saíram do MEI: viram ME e precisam de contabilidade", f: { mei: "excluido" } },
  { rotulo: "Inscrição nova na dívida", dica: "Viraram devedoras da União neste trimestre", f: { sinal: "nova_tri", ordem: "divida" } },
  { rotulo: "Acordo com a PGFN caiu", dica: "Parcelamento rescindido: precisam renegociar", f: { sinal: "rescindiu", ordem: "divida" } },
  { rotulo: "Maiores empresas", dica: "Porte 'demais', por capital social", f: { porte: "5", ordem: "capital_desc", matriz: "matriz" } },
  { rotulo: "Baixadas recentemente", dica: "Encerraram nos últimos 90 dias", f: { situacao: "8", situacao_de: diasAtras(90), ordem: "situacao" } },
  { rotulo: "Grupos com 10+ filiais", dica: "Redes e grupos econômicos", f: { filiais_min: "10", matriz: "matriz" } },
];

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

function Secao({ titulo, n, aberta = false, children }: { titulo: string; n: number; aberta?: boolean; children: React.ReactNode }) {
  return (
    <details open={aberta} className="group rounded-[10px] border border-linha bg-papel">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold">
        <span>{titulo}</span>
        <span className="flex items-center gap-1.5">
          {n > 0 && <span className="rounded-full bg-acento px-1.5 text-[11px] font-medium text-white">{n}</span>}
          <CaretDown size={13} className="text-aco transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="space-y-3 border-t border-linha px-3 pb-3 pt-3">{children}</div>
    </details>
  );
}

const ativos = (r: Record<string, string>, ks: string[]) => ks.filter((k) => r[k]).length;

function Conteudo() {
  const router = useRouter();
  const sp = useSearchParams();
  const qc = useQueryClient();
  const filtros = useMemo(() => Object.fromEntries(CHAVES_BUSCA.map((k) => [k, sp.get(k) ?? ""])) as Record<string, string>, [sp]);
  const [rascunho, setRascunho] = useState(filtros);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [nomeBusca, setNomeBusca] = useState<string | null>(null);
  const [previaFiltros, setPreviaFiltros] = useState(filtros);
  useEffect(() => setRascunho(filtros), [filtros]);
  // Prévia: conta com 500 ms de calma depois da última mudança.
  useEffect(() => { const t = setTimeout(() => setPreviaFiltros(rascunho), 500); return () => clearTimeout(t); }, [rascunho]);

  const aplicar = (f: Record<string, string>, pagina = "") => router.push(`/app/pesquisa${qs({ ...f, pagina })}`, { scroll: false });
  const r = (k: string, v: string) => setRascunho((x) => ({ ...x, [k]: v }));
  const temFiltro = Object.entries(filtros).some(([k, v]) => v && k !== "ordem" && k !== "pagina");

  const estado = useQuery({ queryKey: ["busca-estado"], queryFn: () => api<any>("/busca/estado"), staleTime: 300_000 });
  const res = useQuery({
    queryKey: ["busca", filtros], enabled: temFiltro,
    queryFn: () => api<any>(`/busca${qs({ ...filtros, limite: 30 })}`), placeholderData: keepPreviousData,
  });
  const previa = useQuery({
    queryKey: ["busca-previa", previaFiltros], enabled: Object.entries(previaFiltros).some(([k, v]) => v && k !== "ordem" && k !== "pagina"),
    queryFn: () => api<any>(`/busca/contagem${qs(previaFiltros)}`), placeholderData: keepPreviousData, staleTime: 60_000,
  });
  const buscas = useQuery({ queryKey: ["buscas"], queryFn: () => api<any[]>("/buscas") });
  const tributos = useQuery({ queryKey: ["tributos"], queryFn: () => api<any[]>("/devedores/tributos"), staleTime: 3600_000 });

  const lote = useMutation({
    mutationFn: () => api("/leads/lote", { method: "POST", json: { cnpjs: [...sel] } }),
    onSuccess: (x: any) => { setMsg(`${x.criados} adicionadas aos leads${x.ignorados ? `, ${x.ignorados} já estavam lá` : ""}.`); setSel(new Set()); qc.invalidateQueries({ queryKey: ["busca"] }); },
    onError: (e: any) => setMsg(e.message),
  });
  const salvar = useMutation({
    mutationFn: (nome: string) => api("/buscas", { method: "POST", json: { nome, filtros: { ...filtros, pagina: "", _tipo: "empresas" } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buscas"] }),
  });
  const apagarBusca = useMutation({ mutationFn: (id: string) => api(`/buscas/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["buscas"] }) });

  const d = res.data;
  const pagina = Number(filtros.pagina || 1);
  const paginas = d ? Math.max(1, Math.ceil(d.total / d.limite)) : 1;
  const todosSel = d?.itens?.length > 0 && d.itens.every((i: any) => sel.has(i.cnpj));
  const baseVazia = estado.data && Number(estado.data.estabelecimentos) < 1_000_000;
  const salvasEmpresas = (buscas.data ?? []).filter((b: any) => b.filtros?._tipo === "empresas");

  return (
    <div className="mx-auto max-w-[1440px] p-5 pb-28 md:p-8 md:pb-28">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pesquisa de empresas</h1>
          <p className="mt-0.5 text-sm text-aco">
            {estado.data ? <>{num(estado.data.estabelecimentos)} estabelecimentos na base da Receita</> : "Base da Receita"}
            {" · "}dívida federal e momento da dívida em cada uma
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao tamanho="p" className="lg:hidden" onClick={() => setFiltrosAbertos(!filtrosAbertos)}><Funnel size={14} /> Filtros</Botao>
          {temFiltro && (nomeBusca === null ? (
            <Botao tamanho="p" onClick={() => setNomeBusca("")}><BookmarkSimple size={14} /> Salvar pesquisa</Botao>
          ) : (
            <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (nomeBusca.trim()) { salvar.mutate(nomeBusca.trim()); setNomeBusca(null); } }}>
              <Campo autoFocus className="h-8 w-48 text-[13px]" placeholder="Nome desta pesquisa" value={nomeBusca}
                onChange={(e) => setNomeBusca(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setNomeBusca(null)} />
              <Botao type="submit" tamanho="p" variante="primario">Salvar</Botao>
            </form>
          ))}
          {temFiltro && <Link href={`/app/pesquisa/graficos${qs(filtros)}`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linha bg-papel px-3 text-[13px] font-medium hover:bg-acento-fundo"><ChartBar size={14} /> Gráficos</Link>}
          {temFiltro && <Link href={`/app/pesquisa/exportar${qs(filtros)}`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linha bg-papel px-3 text-[13px] font-medium hover:bg-acento-fundo"><DownloadSimple size={14} /> Exportar</Link>}
        </div>
      </header>

      {baseVazia && (
        <p className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          A base completa da Receita (todas as empresas do Brasil) está sendo carregada. Enquanto isso, a pesquisa de empresas com dívida está em <Link href="/app/devedores" className="font-medium underline">Devedores</Link>.
        </p>
      )}

      <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); aplicar(rascunho); }}>
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aco" />
          <Campo className="h-10 pl-9" placeholder="Razão social, nome fantasia ou CNPJ" value={rascunho.q} onChange={(e) => r("q", e.target.value)} aria-label="Buscar" />
        </div>
        <Botao type="submit" variante="primario" className="h-10">Buscar</Botao>
      </form>

      {/* Pesquisas prontas */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-xs text-aco"><Lightning size={12} /> Rápidas:</span>
        {RAPIDAS.map((x) => (
          <button key={x.rotulo} type="button" title={x.dica}
            onClick={() => aplicar({ ...Object.fromEntries(Object.entries(rascunho).filter(([k]) => ["uf", "municipio", "cnae", "secao"].includes(k))), ...x.f })}
            className="cursor-pointer rounded-full border border-linha bg-papel px-2.5 py-1 text-xs hover:border-acento">{x.rotulo}</button>
        ))}
      </div>
      {salvasEmpresas.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-aco">Salvas:</span>
          {salvasEmpresas.map((b: any) => (
            <span key={b.id} className="inline-flex items-center rounded-full border border-linha bg-papel text-xs">
              <button type="button" className="cursor-pointer py-1 pl-2.5 pr-1.5 hover:text-acento" onClick={() => aplicar(b.filtros)}>{b.nome}</button>
              <button type="button" aria-label={`Apagar ${b.nome}`} className="cursor-pointer py-1 pr-2 text-aco hover:text-red-600" onClick={() => apagarBusca.mutate(b.id)}><Trash size={11} /></button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside className={`${filtrosAbertos ? "block" : "hidden"} space-y-2 lg:sticky lg:top-4 lg:block lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1`}>
          <Secao titulo="1. Segmento" n={ativos(rascunho, ["secao", "cnae", "natureza"])} aberta>
            <div><Rotulo>Atividade (CNAE)</Rotulo><SeletorCnae valor={rascunho.cnae} aoMudar={(v) => r("cnae", v)} />
              <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-xs text-aco">
                <input type="checkbox" checked={rascunho.cnae_secundario === "1"} onChange={(e) => r("cnae_secundario", e.target.checked ? "1" : "")} /> incluir atividade secundária
              </label></div>
            <div><Rotulo>Natureza jurídica</Rotulo><Alternancia opcoes={GRUPOS_NATUREZA} valor={rascunho.natureza} aoMudar={(v) => r("natureza", v)} /></div>
          </Secao>

          <Secao titulo="2. Localização" n={ativos(rascunho, ["uf", "municipio", "bairro", "cep", "logradouro", "raio_km", "hab_min", "hab_max"])} aberta>
            <div>
              <Rotulo>Estados</Rotulo>
              <div className="grid grid-cols-7 gap-1">
                {UFS.map((u) => {
                  const on = (rascunho.uf ? rascunho.uf.split(",") : []).includes(u);
                  return (
                    <button key={u} type="button" onClick={() => {
                      const a = new Set(rascunho.uf ? rascunho.uf.split(",") : []); on ? a.delete(u) : a.add(u); r("uf", [...a].join(","));
                    }} className={`cursor-pointer rounded-md border py-1 text-[11px] font-medium ${on ? "border-acento bg-acento text-white" : "border-linha bg-papel text-aco hover:border-acento"}`}>{u}</button>
                  );
                })}
              </div>
            </div>
            <div><Rotulo>Cidades</Rotulo><SeletorCidades valor={rascunho.municipio} aoMudar={(v) => r("municipio", v)} ufs={rascunho.uf ? rascunho.uf.split(",") : []} /></div>
            <div>
              <Rotulo>Raio a partir da cidade</Rotulo>
              <div className="flex items-center gap-2">
                <Campo inputMode="numeric" placeholder="km" className="w-20" value={rascunho.raio_km}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); r("raio_km", v); r("raio_municipio", v ? (rascunho.municipio.split(",")[0] || "") : ""); }} />
                <span className="text-xs text-aco">{rascunho.municipio ? "da primeira cidade escolhida" : "escolha uma cidade acima"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Rotulo>Bairro</Rotulo><Campo value={rascunho.bairro} onChange={(e) => r("bairro", e.target.value)} placeholder="Centro" /></div>
              <div><Rotulo>CEP</Rotulo><Campo inputMode="numeric" value={rascunho.cep} onChange={(e) => r("cep", e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="137300" /></div>
            </div>
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <div><Rotulo>Rua</Rotulo><Campo value={rascunho.logradouro} onChange={(e) => r("logradouro", e.target.value)} /></div>
              <div><Rotulo>Número</Rotulo><Campo value={rascunho.numero} onChange={(e) => r("numero", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Rotulo>Habitantes, mín.</Rotulo><Campo inputMode="numeric" value={rascunho.hab_min} onChange={(e) => r("hab_min", e.target.value.replace(/\D/g, ""))} /></div>
              <div><Rotulo>máx.</Rotulo><Campo inputMode="numeric" value={rascunho.hab_max} onChange={(e) => r("hab_max", e.target.value.replace(/\D/g, ""))} /></div>
            </div>
          </Secao>

          <Secao titulo="3. Perfil da empresa" n={ativos(rascunho, ["situacao", "situacao_de", "situacao_ate", "matriz", "filiais_min", "abertura_de", "abertura_ate", "idade_min", "idade_max", "porte", "regime", "mei", "simples", "faturamento", "capital_min", "capital_max", "socios_min", "socios_max", "recuperacao"])}>
            <div><Rotulo>Situação cadastral</Rotulo>
              <Alternancia opcoes={[...SITUACOES, ["todas", "Todas"]] as any} valor={rascunho.situacao || "2"} aoMudar={(v) => r("situacao", v.split(",").includes("todas") ? "todas" : v === "2" ? "" : v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Rotulo>Situação desde</Rotulo><Campo type="date" value={rascunho.situacao_de} onChange={(e) => r("situacao_de", e.target.value)} /></div>
              <div><Rotulo>até</Rotulo><Campo type="date" value={rascunho.situacao_ate} onChange={(e) => r("situacao_ate", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Rotulo>Matriz ou filial</Rotulo>
                <Selecao value={rascunho.matriz} onChange={(e) => r("matriz", e.target.value)}>
                  <option value="">Todas</option><option value="matriz">Só matriz</option><option value="filial">Só filiais</option>
                </Selecao></div>
              <div><Rotulo>Filiais, mín.</Rotulo>
                <Selecao value={rascunho.filiais_min} onChange={(e) => r("filiais_min", e.target.value)}>
                  <option value="">Tanto faz</option>{["1", "10", "20", "50", "100"].map((x) => <option key={x} value={x}>{x} ou mais</option>)}
                </Selecao></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Rotulo>Aberta desde</Rotulo><Campo type="date" value={rascunho.abertura_de} onChange={(e) => r("abertura_de", e.target.value)} /></div>
              <div><Rotulo>até</Rotulo><Campo type="date" value={rascunho.abertura_ate} max={hoje()} onChange={(e) => r("abertura_ate", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Rotulo>Idade, mín. (anos)</Rotulo><Campo inputMode="numeric" value={rascunho.idade_min} onChange={(e) => r("idade_min", e.target.value.replace(/\D/g, ""))} /></div>
              <div><Rotulo>máx.</Rotulo><Campo inputMode="numeric" value={rascunho.idade_max} onChange={(e) => r("idade_max", e.target.value.replace(/\D/g, ""))} /></div>
            </div>
            <div><Rotulo>Porte</Rotulo><Alternancia opcoes={PORTES} valor={rascunho.porte} aoMudar={(v) => r("porte", v)} /></div>
            <div><Rotulo>Regime</Rotulo><Alternancia opcoes={REGIMES} valor={rascunho.regime} aoMudar={(v) => r("regime", v)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Rotulo>Simples Nacional</Rotulo>
                <Selecao value={rascunho.simples} onChange={(e) => r("simples", e.target.value)}>
                  <option value="">Tanto faz</option><option value="optante">Optante</option><option value="excluido">Excluída do Simples</option><option value="nao">Não optante</option>
                </Selecao></div>
              <div><Rotulo>MEI</Rotulo>
                <Selecao value={rascunho.mei} onChange={(e) => r("mei", e.target.value)}>
                  <option value="">Tanto faz</option><option value="sim">É MEI</option><option value="excluido">Saiu do MEI</option><option value="nao">Não é MEI</option>
                </Selecao></div>
            </div>
            <div><Rotulo>Faturamento (pelo enquadramento)</Rotulo><Alternancia opcoes={FATURAMENTO} valor={rascunho.faturamento} aoMudar={(v) => r("faturamento", v)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Rotulo>Capital mín.</Rotulo><Campo inputMode="numeric" placeholder="R$" value={rascunho.capital_min} onChange={(e) => r("capital_min", e.target.value.replace(/\D/g, ""))} /></div>
              <div><Rotulo>Capital máx.</Rotulo><Campo inputMode="numeric" placeholder="R$" value={rascunho.capital_max} onChange={(e) => r("capital_max", e.target.value.replace(/\D/g, ""))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Rotulo>Sócios, mín.</Rotulo><Campo inputMode="numeric" value={rascunho.socios_min} onChange={(e) => r("socios_min", e.target.value.replace(/\D/g, ""))} /></div>
              <div><Rotulo>máx.</Rotulo><Campo inputMode="numeric" value={rascunho.socios_max} onChange={(e) => r("socios_max", e.target.value.replace(/\D/g, ""))} /></div>
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm"><input type="checkbox" checked={rascunho.recuperacao === "1"} onChange={(e) => r("recuperacao", e.target.checked ? "1" : "")} /> Em recuperação judicial</label>
          </Secao>

          <Secao titulo="4. Dívida federal" n={ativos(rascunho, ["divida", "valor_min", "valor_max", "tributo", "ajuizada", "acordo", "sinal", "programa", "estadual"])}>
            <div><Rotulo>Dívida ativa na União</Rotulo>
              <Selecao value={rascunho.divida} onChange={(e) => r("divida", e.target.value)}>
                <option value="">Tanto faz</option><option value="com">Com dívida</option><option value="sem">Sem dívida</option>
              </Selecao></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Rotulo>Dívida mín.</Rotulo><Campo inputMode="numeric" placeholder="R$" value={rascunho.valor_min} onChange={(e) => r("valor_min", e.target.value.replace(/\D/g, ""))} /></div>
              <div><Rotulo>máx.</Rotulo><Campo inputMode="numeric" placeholder="R$" value={rascunho.valor_max} onChange={(e) => r("valor_max", e.target.value.replace(/\D/g, ""))} /></div>
            </div>
            <div><Rotulo>Tributo</Rotulo>
              <Selecao value={rascunho.tributo} onChange={(e) => r("tributo", e.target.value)}>
                <option value="">Todos</option>{(tributos.data ?? []).map((t: any) => <option key={t.tributo} value={t.tributo}>{t.tributo}</option>)}
              </Selecao></div>
            <div><Rotulo>Momento da dívida</Rotulo><Alternancia opcoes={SINAIS} valor={rascunho.sinal} aoMudar={(v) => r("sinal", v)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Rotulo>Execução fiscal</Rotulo>
                <Selecao value={rascunho.ajuizada} onChange={(e) => r("ajuizada", e.target.value)}>
                  <option value="">Tanto faz</option><option value="nao">Não ajuizada</option><option value="sim">Ajuizada</option>
                </Selecao></div>
              <div><Rotulo>Acordo</Rotulo>
                <Selecao value={rascunho.acordo} onChange={(e) => r("acordo", e.target.value)}>
                  <option value="">Tanto faz</option><option value="rescindido">Rescindido</option><option value="sem_acordo">Sem acordo</option><option value="negociado">Em acordo</option>
                </Selecao></div>
            </div>
            <div><Rotulo>Pode caber em</Rotulo>
              <Selecao value={rascunho.programa} onChange={(e) => r("programa", e.target.value)}>
                <option value="">Qualquer programa</option><option value="pequeno_valor">Transação de pequeno valor</option><option value="dificil">Difícil recuperação</option>
                <option value="fgts">Transação do FGTS</option><option value="individual">Transação individual (R$ 1 mi+)</option>
              </Selecao></div>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm"><input type="checkbox" checked={rascunho.estadual === "sp"} onChange={(e) => r("estadual", e.target.checked ? "sp" : "")} /> Com dívida estadual em SP</label>
          </Secao>

          <Secao titulo="5. Contato" n={ativos(rascunho, ["contato", "ocultar_contador", "email", "telefone"])}>
            <div><Rotulo>Só com</Rotulo><Alternancia opcoes={CONTATOS} valor={rascunho.contato} aoMudar={(v) => r("contato", v)} /></div>
            <label className="flex cursor-pointer items-start gap-1.5 text-sm"><input type="checkbox" className="mt-1" checked={rascunho.ocultar_contador === "1"} onChange={(e) => r("ocultar_contador", e.target.checked ? "1" : "")} />
              <span>Ocultar contato do contador<span className="block text-xs text-aco">E-mail ou telefone repetido em 5+ empresas é do escritório que as abriu.</span></span></label>
            <div className="grid grid-cols-2 gap-2">
              <div><Rotulo>E-mail ou domínio</Rotulo><Campo value={rascunho.email} onChange={(e) => r("email", e.target.value)} placeholder="empresa.com.br" /></div>
              <div><Rotulo>Telefone</Rotulo><Campo inputMode="numeric" value={rascunho.telefone} onChange={(e) => r("telefone", e.target.value)} /></div>
            </div>
          </Secao>

          <div className="rounded-[10px] border border-linha bg-papel p-3">
            <Rotulo>Ordenar por</Rotulo>
            <Selecao value={rascunho.ordem} onChange={(e) => r("ordem", e.target.value)}>
              {ORDENS.map(([v, l]) => <option key={v} value={v === "contatos" ? "" : v}>{l}</option>)}
            </Selecao>
          </div>
        </aside>

        <section className="min-w-0">
          <AvisoErro erro={res.error} />
          {!temFiltro ? (
            <Vazio titulo="Escolha os filtros e busque" texto="Comece por um ramo de atividade, uma cidade ou uma das pesquisas rápidas. A prévia embaixo mostra quantas empresas a pesquisa vai trazer." />
          ) : (
            <>
              <div className="mb-2 flex min-h-9 flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-aco">
                  <input type="checkbox" aria-label="Selecionar página" checked={todosSel}
                    onChange={() => setSel((s) => { const n = new Set(s); d?.itens?.forEach((i: any) => (todosSel ? n.delete(i.cnpj) : n.add(i.cnpj))); return n; })} />
                  {d ? <><span className="font-semibold text-tinta">{d.total_excede ? "Mais de 100 mil" : num(d.total)}</span> empresas</> : "Buscando…"}
                </div>
                {sel.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{sel.size} selecionadas</span>
                    <Botao tamanho="p" variante="fantasma" onClick={() => setSel(new Set())}><X size={13} /> Limpar</Botao>
                    <Botao tamanho="p" variante="primario" disabled={lote.isPending} onClick={() => lote.mutate()}><Plus size={14} /> Adicionar aos leads</Botao>
                  </div>
                )}
              </div>
              {msg && <p className="mb-2 rounded-lg bg-acento-fundo px-3 py-2 text-sm" role="status">{msg}</p>}

              <ul className={`space-y-3 ${res.isPlaceholderData ? "opacity-60" : ""}`}>
                {res.isLoading && Array.from({ length: 4 }).map((_, i) => <li key={i}><Esqueleto className="h-40" /></li>)}
                {d?.itens?.map((e: any) => <Cartao key={e.cnpj} e={e} marcado={sel.has(e.cnpj)}
                  aoMarcar={() => setSel((s) => { const n = new Set(s); n.has(e.cnpj) ? n.delete(e.cnpj) : n.add(e.cnpj); return n; })} />)}
              </ul>
              {d && d.itens.length === 0 && <Vazio titulo="Nenhuma empresa com esses filtros" texto="Afrouxe algum filtro." />}
              {d && d.total > d.limite && (
                <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginação">
                  <span className="text-aco">Página {pagina} de {d.total_excede ? "muitas" : num(paginas)}</span>
                  <div className="flex gap-2">
                    <Botao tamanho="p" disabled={pagina <= 1} onClick={() => aplicar(filtros, String(pagina - 1))}><CaretLeft size={14} /> Anterior</Botao>
                    <Botao tamanho="p" disabled={pagina >= paginas} onClick={() => aplicar(filtros, String(pagina + 1))}>Próxima <CaretRight size={14} /></Botao>
                  </div>
                </nav>
              )}
            </>
          )}
        </section>
      </div>

      {/* Barra fixa: prévia + buscar */}
      <div className="fixed inset-x-0 bottom-14 z-20 border-t border-linha bg-papel/95 px-5 py-2.5 backdrop-blur md:bottom-0 lg:left-[232px]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
          <p className="text-sm">
            <span className="text-xs uppercase tracking-wide text-aco">Prévia </span>
            {previa.data ? <b className="font-mono tabular">{previa.data.excede ? "mais de 100 mil" : num(previa.data.total)}</b> : <span className="text-aco">escolha um filtro</span>}
            {previa.data && " empresas"}{previa.isFetching && <span className="text-aco"> …</span>}
          </p>
          <div className="flex gap-2">
            <Botao variante="fantasma" onClick={() => aplicar({} as any)}>Limpar</Botao>
            <Botao variante="primario" onClick={() => { aplicar(rascunho); setFiltrosAbertos(false); }}><MagnifyingGlass size={15} /> Buscar empresas</Botao>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cartao({ e, marcado, aoMarcar }: { e: any; marcado: boolean; aoMarcar: () => void }) {
  const div = e.divida;
  const regime = e.opcao_mei ? "MEI" : e.opcao_simples ? "Simples" : "Fora do Simples";
  return (
    <li className="rounded-[10px] border border-linha bg-papel">
      <div className="flex gap-3 p-4">
        <input type="checkbox" className="mt-1.5" aria-label={`Selecionar ${e.razao_social}`} checked={marcado} onChange={aoMarcar} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={`/app/empresas/${e.cnpj}`} className="rounded-full bg-acento px-2.5 py-0.5 font-mono text-xs font-medium text-white tabular hover:opacity-90">{cnpjMascara(e.cnpj)}</Link>
            <button type="button" aria-label="Copiar CNPJ" onClick={() => navigator.clipboard?.writeText(e.cnpj)} className="cursor-pointer rounded p-1 text-aco hover:text-tinta"><Copy size={13} /></button>
            <Selo tom={e.situacao === 2 ? "ok" : "perigo"}>{ROT_SIT[e.situacao] ?? "?"}</Selo>
            {!e.matriz && <Selo>filial</Selo>}
            {div ? <Selo tom="alerta">dívida federal {brl(div.valor_total, true)}</Selo> : <Selo tom="ok">sem dívida federal</Selo>}
            {div?.tem_ajuizada && <Selo tom="perigo">ajuizada</Selo>}
            {Number(e.sinais?.novas_tri) > 0 && <Selo tom="perigo">inscrição nova no trimestre</Selo>}
            {Number(e.sinais?.rescindidas_12m) > 0 && <Selo tom="perigo">acordo caiu</Selo>}
            {e.e_lead && <Selo tom="acento"><Check size={10} /> lead</Selo>}
          </div>
          <Link href={`/app/empresas/${e.cnpj}`} className="mt-1.5 block text-[15px] font-semibold leading-snug hover:underline">{e.razao_social || "(razão social não carregada)"}</Link>
          {e.nome_fantasia && <p className="text-xs text-aco">{e.nome_fantasia}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-fundo px-2 py-0.5"><MapPin size={11} />{e.municipio}/{e.uf}</span>
            {e.data_abertura && <span className="rounded-full bg-fundo px-2 py-0.5">aberta {dataBr(e.data_abertura)} ({desde(e.data_abertura)})</span>}
            {e.porte && <span className="rounded-full bg-fundo px-2 py-0.5">{ROT_PORTE[e.porte]}</span>}
            <span className="rounded-full bg-fundo px-2 py-0.5">{regime}</span>
            {e.natureza && <span className="rounded-full bg-fundo px-2 py-0.5">{e.natureza}</span>}
            {Number(e.capital_social) > 0 && <span className="rounded-full bg-fundo px-2 py-0.5">capital {brl(e.capital_social, true)}</span>}
            {e.grupo?.estab > 1 && <span className="rounded-full bg-fundo px-2 py-0.5">{e.grupo.estab} estabelecimentos</span>}
          </div>
          <p className="mt-2 text-[13px] text-aco">{[e.logradouro, e.numero, e.complemento, e.bairro, e.cep && `CEP ${e.cep}`].filter(Boolean).join(", ")}</p>
          {e.cnae_principal && <p className="text-[13px]"><span className="font-mono text-xs tabular text-aco">{e.cnae_principal}</span> · {e.cnae_descricao}</p>}
          {e.socios?.length > 0 && <p className="mt-0.5 flex items-center gap-1 text-[13px] text-aco"><Users size={13} /> {e.socios.join(", ")}{e.grupo?.socios > e.socios.length && ` e mais ${e.grupo.socios - e.socios.length}`}</p>}
        </div>
      </div>
      {(e.telefone || e.telefone2 || e.email) && (
        <div className="flex flex-wrap gap-2 border-t border-linha px-4 py-2.5 text-sm">
          {[e.telefone, e.telefone2].filter(Boolean).map((t: string, i: number) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-lg border border-linha px-2.5 py-1">
              <Phone size={13} className="text-aco" /><a href={`tel:+55${t}`} className="font-mono tabular hover:underline">{telefoneFmt(t)}</a>
              {i === 0 && e.telefone_contador && <Selo tom="alerta">contador?</Selo>}
              {ehCelular(t) && <a href={`https://wa.me/55${t}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-aco hover:text-tinta"><WhatsappLogo size={14} /></a>}
            </span>
          ))}
          {e.email && (
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-linha px-2.5 py-1">
              <EnvelopeSimple size={13} className="text-aco" /><a href={`mailto:${e.email}`} className="truncate hover:underline">{e.email}</a>
              {e.email_contador && <Selo tom="alerta">contador?</Selo>}
            </span>
          )}
        </div>
      )}
    </li>
  );
}

export default function Pesquisa() {
  return <Suspense><Conteudo /></Suspense>;
}
