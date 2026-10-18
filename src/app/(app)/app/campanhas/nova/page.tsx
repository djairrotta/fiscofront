"use client";
/**
 * Nova campanha: para quem (pesquisa atual, lista importada), canal,
 * mensagem (modelo salvo, IA ou do zero, com variáveis), ritmo de envio.
 * Ao criar, a campanha já é preparada (lista de destinos montada) e abre
 * a tela dela, onde dá para conferir a prévia, mandar teste e iniciar.
 */
import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, EnvelopeSimple, FloppyDisk, Sparkle, WhatsappLogo } from "@phosphor-icons/react";
import Link from "next/link";
import { api, qs } from "@/lib/api";
import { num } from "@/lib/formato";
import { resumoFiltros } from "@/lib/busca";
import { VARIAVEIS } from "@/lib/campanhas";
import { AvisoErro, Botao, Campo, Rotulo, Selecao, Superficie } from "@/componentes/app/ui";

function Conteudo() {
  const sp = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const filtrosUrl = useMemo(() => Object.fromEntries([...sp.entries()].filter(([k, v]) => v && !["pagina", "canal", "lista"].includes(k))), [sp]);
  const [origem, setOrigem] = useState<"pesquisa" | "lista">(sp.get("lista") ? "lista" : "pesquisa");
  const [listaId, setListaId] = useState(sp.get("lista") ?? "");
  const [canal, setCanal] = useState<"email" | "whatsapp">(sp.get("canal") === "whatsapp" ? "whatsapp" : "email");
  const [nome, setNome] = useState("");
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [cfg, setCfg] = useState({ limite_dia: "", intervalo_s: "", janela_ini: "8", janela_fim: "19", so_dias_uteis: true, ocultar_contador: true, remetente_nome: "", responder_para: "" });
  const txt = useRef<HTMLTextAreaElement>(null);

  const listas = useQuery({ queryKey: ["listas"], queryFn: () => api<any[]>("/listas") });
  const modelos = useQuery({ queryKey: ["modelos"], queryFn: () => api<any[]>("/modelos") });
  const perfil = useQuery({ queryKey: ["perfil-comercial"], queryFn: () => api<any>("/perfil-comercial") });
  const est = useQuery({ queryKey: ["campanhas-estado"], queryFn: () => api<any>("/campanhas/estado") });
  const fPrevia = origem === "lista" ? { lista: listaId } : filtrosUrl;
  const previa = useQuery({
    queryKey: ["busca-previa", { ...fPrevia, contato: canal === "email" ? "email" : "celular", ocultar_contador: cfg.ocultar_contador ? "1" : "" }],
    enabled: origem === "pesquisa" ? Object.keys(filtrosUrl).length > 0 : !!listaId,
    queryFn: () => api<any>(`/busca/contagem${qs({ ...fPrevia, contato: canal === "email" ? "email" : "celular", ocultar_contador: cfg.ocultar_contador ? "1" : "" })}`),
  });

  const ia = useMutation({ mutationFn: () => api<any>("/ia/modelo", { method: "POST", json: { canal, objetivo } }), onSuccess: (r) => { setAssunto(r.assunto || ""); setCorpo(r.corpo || ""); } });
  const salvarModelo = useMutation({
    mutationFn: () => api("/modelos", { method: "POST", json: { nome: nome || assunto || "Modelo", canal, assunto, corpo } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modelos"] }),
  });
  const criar = useMutation({
    mutationFn: async () => {
      const c = await api<any>("/campanhas", {
        method: "POST", json: {
          nome: nome || (origem === "lista" ? listas.data?.find((l) => l.id === listaId)?.nome : resumoFiltros(filtrosUrl).slice(0, 3).join(" · ")) || "Campanha",
          canal, assunto, corpo, origem: origem === "lista" ? { lista_id: listaId } : { filtros: filtrosUrl },
          ...cfg, limite_dia: cfg.limite_dia || undefined, intervalo_s: cfg.intervalo_s || undefined,
          remetente_nome: cfg.remetente_nome || perfil.data?.assinatura?.split("·")[0]?.trim() || undefined,
        },
      });
      await api(`/campanhas/${c.id}/preparar`, { method: "POST", json: {} });
      return c;
    },
    onSuccess: (c) => router.push(`/app/campanhas/${c.id}`),
  });

  const inserir = (v: string) => {
    const el = txt.current;
    const t = `{{${v}}}`;
    if (!el) { setCorpo((c) => c + t); return; }
    const a = el.selectionStart, b = el.selectionEnd;
    setCorpo(corpo.slice(0, a) + t + corpo.slice(b));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + t.length, a + t.length); });
  };
  const exemplo = { empresa: "Padaria Bom Dia", cidade: "Campinas", atividade: "padaria e confeitaria", socio: "Maria", uf: "SP", cnpj: "12345678000190" } as Record<string, string>;
  const render = (s: string) => s.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, k) => exemplo[k] ?? "");
  const pode = corpo.trim() && (canal === "whatsapp" || assunto.trim()) && (origem === "lista" ? listaId : Object.keys(filtrosUrl).length);

  return (
    <div className="mx-auto max-w-[1100px] p-5 md:p-8">
      <Link href="/app/campanhas" className="inline-flex items-center gap-1 text-sm text-aco hover:text-tinta"><ArrowLeft size={14} /> Campanhas</Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Nova campanha</h1>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Superficie titulo="1. Para quem">
            <div className="space-y-3 p-4">
              <div className="flex gap-1.5">
                {(["pesquisa", "lista"] as const).map((o) => (
                  <button key={o} type="button" onClick={() => setOrigem(o)} aria-pressed={origem === o}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${origem === o ? "border-acento bg-acento text-white" : "border-linha"}`}>
                    {o === "pesquisa" ? "Empresas da pesquisa" : "Lista importada"}
                  </button>
                ))}
              </div>
              {origem === "pesquisa" ? (
                Object.keys(filtrosUrl).length ? (
                  <div className="flex flex-wrap gap-1">{resumoFiltros(filtrosUrl).map((c) => <span key={c} className="rounded-full bg-fundo px-2 py-0.5 text-xs">{c}</span>)}
                    <Link href={`/app/pesquisa${qs(filtrosUrl)}`} className="text-xs text-acento underline">mudar filtros</Link></div>
                ) : <p className="text-sm text-aco">Abra a <Link href="/app/pesquisa" className="text-acento underline">pesquisa de empresas</Link>, filtre e use “Enviar campanha”.</p>
              ) : (
                <Selecao value={listaId} onChange={(e) => setListaId(e.target.value)}>
                  <option value="">Escolha a lista</option>
                  {listas.data?.map((l) => <option key={l.id} value={l.id}>{l.nome} ({num(l.total)})</option>)}
                </Selecao>
              )}
              <div className="flex gap-1.5">
                {(["email", "whatsapp"] as const).map((c) => (
                  <button key={c} type="button" onClick={() => setCanal(c)} aria-pressed={canal === c}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${canal === c ? "border-acento bg-acento text-white" : "border-linha"}`}>
                    {c === "email" ? <><EnvelopeSimple size={14} /> E-mail</> : <><WhatsappLogo size={14} /> WhatsApp</>}
                  </button>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={cfg.ocultar_contador} onChange={(e) => setCfg({ ...cfg, ocultar_contador: e.target.checked })} /> Pular contatos que parecem ser do contador da empresa</label>
              <p className="text-sm"><b className="font-mono tabular">{previa.data ? (previa.data.excede ? "100 mil+" : num(previa.data.total)) : "…"}</b> empresas com {canal === "email" ? "e-mail" : "celular"} (antes de tirar repetidos e descadastrados).</p>
            </div>
          </Superficie>

          <Superficie titulo="2. Mensagem" acao={
            (modelos.data ?? []).filter((m) => m.canal === canal).length > 0 && (
              <Selecao className="h-8 w-48 text-xs" value="" onChange={(e) => { const m = modelos.data?.find((x) => x.id === e.target.value); if (m) { setAssunto(m.assunto ?? ""); setCorpo(m.corpo); } }}>
                <option value="">Usar modelo salvo…</option>
                {modelos.data!.filter((m) => m.canal === canal).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </Selecao>
            )
          }>
            <div className="space-y-3 p-4">
              <div className="flex gap-2">
                <Campo value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Objetivo (ex.: oferecer abertura de contabilidade para empresas novas)" />
                <Botao type="button" disabled={ia.isPending} onClick={() => ia.mutate()}><Sparkle size={14} /> {ia.isPending ? "Escrevendo…" : "Escrever com IA"}</Botao>
              </div>
              <AvisoErro erro={ia.error} />
              {canal === "email" && <div><Rotulo>Assunto</Rotulo><Campo value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Contabilidade para a {{empresa}}" /></div>}
              <div>
                <Rotulo>Texto</Rotulo>
                <textarea ref={txt} value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={10}
                  className="w-full rounded-lg border border-linha bg-papel px-3 py-2 text-sm outline-none focus:border-acento"
                  placeholder={"Olá, tudo bem?\n\nVi que a {{empresa}} abriu há pouco tempo em {{cidade}}…"} />
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="text-xs text-aco">Inserir:</span>
                  {VARIAVEIS.map(([v, r]) => <button key={v} type="button" onClick={() => inserir(v)} className="cursor-pointer rounded-full border border-linha px-2 py-0.5 text-xs hover:border-acento" title={r}>{`{{${v}}}`}</button>)}
                </div>
                <p className="mt-1 text-xs text-aco">{canal === "email" ? "O rodapé com a identificação e o link de descadastro entra sozinho." : "A linha “Para não receber mais, responda SAIR” entra sozinha."}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Campo className="max-w-xs" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da campanha" />
                <Botao type="button" tamanho="p" disabled={!corpo.trim() || salvarModelo.isPending} onClick={() => salvarModelo.mutate()}><FloppyDisk size={13} /> {salvarModelo.isSuccess ? "Modelo salvo" : "Salvar como modelo"}</Botao>
              </div>
            </div>
          </Superficie>

          <Superficie titulo="3. Ritmo e remetente">
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div><Rotulo>Máximo por dia</Rotulo><Campo inputMode="numeric" value={cfg.limite_dia} onChange={(e) => setCfg({ ...cfg, limite_dia: e.target.value.replace(/\D/g, "") })} placeholder={canal === "whatsapp" ? "80 (até 300)" : "300"} /></div>
              <div><Rotulo>Intervalo entre envios (segundos)</Rotulo><Campo inputMode="numeric" value={cfg.intervalo_s} onChange={(e) => setCfg({ ...cfg, intervalo_s: e.target.value.replace(/\D/g, "") })} placeholder={canal === "whatsapp" ? "45 (mín. 20)" : "10"} /></div>
              <div><Rotulo>Enviar das (hora de Brasília)</Rotulo><Campo inputMode="numeric" value={cfg.janela_ini} onChange={(e) => setCfg({ ...cfg, janela_ini: e.target.value.replace(/\D/g, "") })} /></div>
              <div><Rotulo>até as</Rotulo><Campo inputMode="numeric" value={cfg.janela_fim} onChange={(e) => setCfg({ ...cfg, janela_fim: e.target.value.replace(/\D/g, "") })} /></div>
              <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={cfg.so_dias_uteis} onChange={(e) => setCfg({ ...cfg, so_dias_uteis: e.target.checked })} /> Só em dias úteis</label>
              {canal === "email" && <>
                <div><Rotulo>Nome do remetente</Rotulo><Campo value={cfg.remetente_nome} onChange={(e) => setCfg({ ...cfg, remetente_nome: e.target.value })} placeholder="Souza Contabilidade" /></div>
                <div><Rotulo>Respostas para</Rotulo><Campo type="email" value={cfg.responder_para} onChange={(e) => setCfg({ ...cfg, responder_para: e.target.value })} placeholder="contato@seuescritorio.com.br" /></div>
                <p className="text-xs text-aco sm:col-span-2">Sai de {est.data?.remetente ?? "…"}; as respostas vão para o e-mail acima.</p>
              </>}
              {canal === "whatsapp" && <p className="text-xs text-amber-700 dark:text-amber-300 sm:col-span-2">WhatsApp bloqueia números que mandam muitas mensagens para quem não tem o contato salvo. Comece com poucas por dia e intervalo longo.</p>}
            </div>
          </Superficie>
        </div>

        <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <Superficie titulo="Prévia">
            <div className="p-4 text-sm">
              {canal === "email" && <p className="font-semibold">{render(assunto) || <span className="text-aco">(assunto)</span>}</p>}
              <p className="mt-2 whitespace-pre-wrap text-[13px]">{render(corpo) || <span className="text-aco">(texto)</span>}</p>
              <p className="mt-3 border-t border-linha pt-2 text-[11px] text-aco">Exemplo com uma empresa fictícia. Na tela da campanha aparece a prévia com a primeira empresa real.</p>
            </div>
          </Superficie>
          <AvisoErro erro={criar.error} />
          <Botao variante="primario" className="h-11 w-full" disabled={!pode || criar.isPending} onClick={() => criar.mutate()}>{criar.isPending ? "Montando a lista…" : "Criar e preparar"}</Botao>
          <p className="text-xs text-aco">Nada é enviado ainda: na próxima tela você confere, manda um teste e inicia.</p>
        </div>
      </div>
    </div>
  );
}

export default function NovaCampanha() {
  return <Suspense><Conteudo /></Suspense>;
}
