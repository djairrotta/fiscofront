"use client";
/**
 * Pesquisa da empresa na internet (agente Jev). Abre o buscador, entra no
 * site da propria empresa e na pagina de contato. So mostra contato que
 * estava escrito numa pagina visitada, com o link de onde saiu.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowClockwise, ArrowSquareOut, EnvelopeSimple, FacebookLogo, Globe, InstagramLogo, LinkedinLogo, Phone, Warning, WhatsappLogo,
} from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { dataBr, ehCelular, telefoneFmt } from "@/lib/formato";
import { Botao, Selo, Superficie } from "./ui";

const link = (v: string) => (/^https?:\/\//i.test(v) ? v : `https://${v.replace(/^@/, "instagram.com/")}`);
const host = (u: string) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return u; } };

export function PesquisaInternet({ cnpj, temLead }: { cnpj: string; temLead: boolean }) {
  const qc = useQueryClient();
  const estado = useQuery({ queryKey: ["internet-estado"], queryFn: () => api<any>("/internet/estado"), staleTime: 60_000 });
  const salvo = useQuery({ queryKey: ["internet", cnpj], queryFn: () => api<any>(`/empresas/${cnpj}/internet`) });
  const pesquisar = useMutation({
    mutationFn: (forcar: boolean) => api(`/empresas/${cnpj}/internet${qs(forcar ? { forcar: "1" } : {})}`, { method: "POST" }),
    onSuccess: (r) => qc.setQueryData(["internet", cnpj], r),
  });
  const paraLead = useMutation({
    mutationFn: () => api<any>(`/empresas/${cnpj}/internet/para-lead`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); qc.invalidateQueries({ queryKey: ["lead"] }); },
  });

  const r = salvo.data;
  const d = r?.dados;
  const fonte = (campo: string, valor: string) => d?.evidencias?.find((e: any) => e.campo === campo && e.valor === valor)?.url;
  const configurado = estado.data?.configurado;
  const achou = d && (d.telefones?.length || d.emails?.length || d.instagram || d.facebook || d.linkedin);

  return (
    <Superficie titulo="Na internet" acao={d && !pesquisar.isPending && (
      <button type="button" onClick={() => pesquisar.mutate(true)} disabled={!configurado}
        className="inline-flex cursor-pointer items-center gap-1 text-xs text-aco hover:text-tinta disabled:cursor-default disabled:opacity-50" title="Pesquisar de novo">
        <ArrowClockwise size={12} /> de novo
      </button>
    )}>
      <div className="space-y-3 p-4 text-sm">
        {pesquisar.isPending ? (
          <div className="space-y-2" role="status">
            <div className="h-1.5 overflow-hidden rounded-full bg-linha"><div className="h-full w-1/3 animate-[entrar_1.2s_ease-in-out_infinite_alternate] rounded-full bg-acento" /></div>
            <p className="text-aco">Procurando o site da empresa e a página de contato. Leva até um minuto e meio.</p>
          </div>
        ) : !d ? (
          <>
            <p className="text-aco">Procura o site da própria empresa e traz telefone, e-mail e redes que estiverem publicados lá, com o link de onde saiu cada um.</p>
            <Botao tamanho="p" variante="primario" disabled={!configurado} onClick={() => pesquisar.mutate(false)}>
              <Globe size={14} /> Pesquisar na internet
            </Botao>
            {estado.data && !configurado && <p className="text-xs text-aco">{estado.data.motivo}</p>}
          </>
        ) : (
          <>
            {d.mesma_empresa === false && (
              <p className="flex gap-1.5 text-amber-800 dark:text-amber-300"><Warning size={15} className="mt-0.5 shrink-0" /> {d.observacao || "O site encontrado é de outra empresa."}</p>
            )}
            {d.mesma_empresa !== false && d.site && (
              <a href={d.site} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-medium hover:underline">
                <Globe size={15} className="shrink-0 text-aco" /> <span className="truncate">{host(d.site)}</span> <ArrowSquareOut size={12} className="shrink-0 text-aco" />
              </a>
            )}
            {d.atividade && d.mesma_empresa !== false && <p className="text-[13px] text-aco">{d.atividade}</p>}

            {(d.telefones ?? []).map((t: string) => (
              <div key={t} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Phone size={15} className="shrink-0 text-aco" />
                  <a href={`tel:+55${t}`} className="truncate font-mono tabular hover:underline">{telefoneFmt(t)}</a>
                  {fonte("telefone", t) && <a href={fonte("telefone", t)} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-aco hover:underline" title="Página onde o número aparece">{host(fonte("telefone", t))}</a>}
                </span>
                {ehCelular(t) && <a href={`https://wa.me/55${t}`} target="_blank" rel="noopener noreferrer" aria-label="Abrir no WhatsApp"
                  className="rounded-full p-1.5 text-aco hover:bg-acento-fundo hover:text-tinta"><WhatsappLogo size={16} /></a>}
              </div>
            ))}
            {(d.emails ?? []).map((m: string) => (
              <div key={m} className="flex min-w-0 items-center gap-2">
                <EnvelopeSimple size={15} className="shrink-0 text-aco" />
                <a href={`mailto:${m}`} className="truncate hover:underline">{m}</a>
              </div>
            ))}
            {(d.instagram || d.facebook || d.linkedin) && (
              <div className="flex flex-wrap gap-3 text-aco">
                {d.instagram && <a href={link(d.instagram)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-tinta"><InstagramLogo size={15} /> Instagram</a>}
                {d.facebook && <a href={link(d.facebook)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-tinta"><FacebookLogo size={15} /> Facebook</a>}
                {d.linkedin && <a href={link(d.linkedin)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-tinta"><LinkedinLogo size={15} /> LinkedIn</a>}
              </div>
            )}
            {d.endereco && d.mesma_empresa !== false && <p className="text-[13px]">{d.endereco}</p>}

            {!achou && d.mesma_empresa !== false && (
              <p className="text-aco">{d.observacao || "Nenhum contato publicado no site encontrado."}</p>
            )}
            {achou && d.mesma_empresa == null && <Selo tom="alerta">confirme que o site é desta empresa</Selo>}

            {achou && temLead && (
              <Botao tamanho="p" disabled={paraLead.isPending || paraLead.isSuccess} onClick={() => paraLead.mutate()}>
                {paraLead.isSuccess ? `${paraLead.data.telefones_novos + paraLead.data.emails_novos} contato(s) novo(s) no lead` : "Levar contatos para o lead"}
              </Botao>
            )}
            <p className="text-[11px] leading-relaxed text-aco">
              Pesquisado em {dataBr(r.criado_em)}{r.cache ? " (guardado)" : ""}
              {d.paginas_visitadas?.length ? ` · ${d.paginas_visitadas.filter((u: string) => !/duckduckgo|bing\.com|google\./.test(u)).length} página(s) do site lida(s)` : ""}
              {d.status_navegacao === "blocked" ? " · o site bloqueou a navegação" : d.status_navegacao === "limite" ? " · parou no limite de tempo" : ""}
            </p>
          </>
        )}
        {(pesquisar.error || paraLead.error) && <p className="text-xs text-red-700">{((pesquisar.error || paraLead.error) as any).message}</p>}
      </div>
    </Superficie>
  );
}
