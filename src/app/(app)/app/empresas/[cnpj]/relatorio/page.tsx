"use client";
/**
 * Relatório da empresa para o cliente (documento automático): cadastro,
 * regime, dívida ativa federal com o histórico trimestral, o que mudou,
 * programas de regularização em que pode caber e as inscrições. Sai com a
 * marca do escritório (perfil comercial) e vira PDF pelo navegador.
 */
import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { brl, cnpjMascara, dataBr, num } from "@/lib/formato";
import { Botao, Esqueleto } from "@/componentes/app/ui";

const ORIGEM: Record<string, string> = { PGFN_GERAL: "Tributos", PGFN_PREV: "Previdenciária", PGFN_FGTS: "FGTS" };
const tri = (ref: string) => { const [a, m] = ref.split("-"); return `${Math.ceil(Number(m) / 3)}º tri/${a}`; };

export default function Relatorio({ params }: { params: Promise<{ cnpj: string }> }) {
  const { cnpj } = use(params);
  const f = useQuery({ queryKey: ["empresa", cnpj], queryFn: () => api<any>(`/empresas/${cnpj}`) });
  const h = useQuery({ queryKey: ["historico", cnpj], queryFn: () => api<any>(`/empresas/${cnpj}/historico`) });
  const b = useQuery({ queryKey: ["empresa-base", cnpj], queryFn: () => api<any>(`/empresas/${cnpj}/base`).catch(() => null) });
  const p = useQuery({ queryKey: ["perfil-comercial"], queryFn: () => api<any>("/perfil-comercial") });
  const [obs, setObs] = useState("");
  if (f.isLoading || h.isLoading) return <div className="p-8"><Esqueleto className="h-96" /></div>;
  const d = f.data, dev = d?.devedor, cad = d?.cadastro, e = b.data?.estab, hist = h.data;
  const nome = dev?.nome ?? cad?.razao_social ?? cnpjMascara(cnpj);
  const serie: any[] = hist?.serie ?? [];
  const s = hist?.sinais;
  const hoje = new Date().toLocaleDateString("pt-BR");
  const regime = e ? (e.opcao_mei ? "MEI" : e.opcao_simples ? "Simples Nacional" : "Fora do Simples") : cad?.simples == null ? "–" : cad.simples ? (cad.mei ? "MEI" : "Simples Nacional") : "Fora do Simples";

  return (
    <div className="mx-auto max-w-[820px] bg-papel p-8 text-[13px] leading-relaxed print:max-w-none print:p-0">
      <style>{`@media print { @page { size: A4; margin: 14mm } }`}</style>
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-aco">Revise, acrescente uma observação e salve em PDF (Imprimir → Salvar como PDF).</p>
        <Botao variante="primario" onClick={() => window.print()}><Printer size={15} /> Imprimir / PDF</Botao>
      </div>

      <header className="border-b-2 border-tinta pb-3">
        <p className="text-xs uppercase tracking-wide text-aco">{p.data?.assinatura || "Relatório fiscal"}</p>
        <h1 className="mt-1 text-xl font-semibold">{nome}</h1>
        <p className="font-mono text-xs">CNPJ {cnpjMascara(d?.cnpj ?? cnpj)} · emitido em {hoje}</p>
      </header>

      <section className="mt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Cadastro</h2>
        <table className="mt-2 w-full"><tbody>
          {[
            ["Situação", e ? `${({ 2: "Ativa", 8: "Baixada", 3: "Suspensa", 4: "Inapta", 1: "Nula" } as any)[e.situacao] ?? "-"} desde ${dataBr(e.data_situacao)}` : cad?.situacao],
            ["Abertura", dataBr(e?.data_abertura ?? cad?.data_abertura)],
            ["Atividade", cad?.cnae ? `${cad.cnae.codigo} ${cad.cnae.descricao ?? ""}` : e?.cnae_principal],
            ["Natureza jurídica", e?.natureza ?? cad?.natureza_juridica],
            ["Regime", [regime, e?.data_exclusao_simples && !e.opcao_simples ? `excluída do Simples em ${dataBr(e.data_exclusao_simples)}` : null, e?.data_exclusao_mei && !e.opcao_mei ? `saiu do MEI em ${dataBr(e.data_exclusao_mei)}` : null].filter(Boolean).join(" · ")],
            ["Capital social", cad?.capital_social != null ? brl(cad.capital_social) : e?.capital_social != null ? brl(e.capital_social) : null],
            ["Endereço", cad?.endereco ? [cad.endereco.logradouro, cad.endereco.numero, cad.endereco.bairro, `${cad.endereco.municipio}/${cad.endereco.uf}`].filter(Boolean).join(", ") : null],
            ["Estabelecimentos", b.data?.total_estab > 1 ? `${b.data.total_estab} (${b.data.ativos} ativos)` : null],
          ].filter(([, v]) => v).map(([r, v]) => (
            <tr key={r as string} className="border-b border-linha"><td className="w-40 py-1.5 pr-3 align-top text-aco">{r}</td><td className="py-1.5">{v}</td></tr>
          ))}
        </tbody></table>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Dívida ativa federal (PGFN)</h2>
        {dev ? (
          <>
            <p className="mt-2">Total inscrito: <b className="font-mono">{brl(dev.valor_total)}</b> em {num(dev.qtd_inscricoes)} inscrições{Number(dev.valor_ajuizado) > 0 && <>, das quais <b className="font-mono">{brl(dev.valor_ajuizado)}</b> em execução fiscal</>}. Base de {dataBr(dev.data_referencia)}.</p>
            {s && (
              <ul className="mt-2 list-disc pl-5">
                {Number(s.novas_tri) > 0 && <li>{num(s.novas_tri)} inscrição(ões) nova(s) no último trimestre ({brl(s.novas_tri_valor)}).</li>}
                {Number(s.rescindidas_12m) > 0 && <li>{num(s.rescindidas_12m)} acordo(s)/parcelamento(s) rescindido(s) nos últimos 12 meses.</li>}
                {s.variacao_12m_pct != null && <li>Variação em 12 meses: {Number(s.variacao_12m_pct) > 0 ? "+" : ""}{Number(s.variacao_12m_pct).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%.</li>}
                {s.devedora_desde && <li>Com dívida inscrita desde {tri(s.devedora_desde)}.</li>}
              </ul>
            )}
            {serie.length > 1 && (
              <table className="mt-3 w-full text-xs">
                <thead><tr className="border-b border-tinta text-left"><th className="py-1">Trimestre</th><th className="py-1 text-right">Inscrições</th><th className="py-1 text-right">Valor</th></tr></thead>
                <tbody>{serie.slice(-8).map((x: any) => (
                  <tr key={x.ref} className="border-b border-linha"><td className="py-1">{tri(x.ref)}</td><td className="py-1 text-right font-mono">{num(x.qtd)}</td><td className="py-1 text-right font-mono">{brl(x.valor)}</td></tr>
                ))}</tbody>
              </table>
            )}
            {d.programas?.length > 0 && (
              <>
                <h3 className="mt-4 font-semibold">Programas de regularização que podem caber</h3>
                <ul className="mt-1 list-disc pl-5">{d.programas.map((pr: any) => <li key={pr.slug}>{pr.nome}{pr.orgao ? ` (${pr.orgao})` : ""}{pr.adesao_fim ? `, adesão até ${dataBr(pr.adesao_fim)}` : ""}</li>)}</ul>
              </>
            )}
            {d.inscricoes?.length > 0 && (
              <>
                <h3 className="mt-4 font-semibold">Inscrições</h3>
                <table className="mt-1 w-full text-xs">
                  <thead><tr className="border-b border-tinta text-left"><th className="py-1">Inscrição</th><th className="py-1">Tributo</th><th className="py-1">Situação</th><th className="py-1">Inscrita em</th><th className="py-1 text-right">Valor</th></tr></thead>
                  <tbody>{d.inscricoes.slice(0, 60).map((i: any, n: number) => (
                    <tr key={n} className="break-inside-avoid border-b border-linha"><td className="py-1 font-mono">{i.numero_inscricao}</td><td className="py-1">{i.tributo ?? ORIGEM[i.origem]}</td><td className="py-1">{i.situacao}</td><td className="py-1 font-mono">{dataBr(i.data_inscricao)}</td><td className="py-1 text-right font-mono">{brl(i.valor_consolidado)}</td></tr>
                  ))}</tbody>
                </table>
                {d.inscricoes.length > 60 && <p className="text-xs text-aco">e mais {d.inscricoes.length - 60} inscrições.</p>}
              </>
            )}
          </>
        ) : <p className="mt-2">A empresa não aparece na base de dívida ativa federal da PGFN na data de referência mais recente.</p>}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Observações</h2>
        <textarea value={obs} onChange={(ev) => setObs(ev.target.value)} rows={4} placeholder="Escreva aqui a sua análise e a recomendação ao cliente."
          className="mt-2 w-full rounded border border-linha p-2 print:hidden" />
        {obs && <p className="mt-2 hidden whitespace-pre-wrap print:block">{obs}</p>}
      </section>

      <footer className="mt-8 border-t border-linha pt-2 text-[11px] text-aco">
        Fontes: Receita Federal (cadastro CNPJ) e PGFN (Dados Abertos da Dívida Ativa). Valores consolidados na data de referência da base; não substituem a certidão oficial.
        {p.data?.site && <> · {p.data.site}</>}
      </footer>
    </div>
  );
}
