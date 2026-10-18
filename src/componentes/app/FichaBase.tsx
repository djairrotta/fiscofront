"use client";
/**
 * Ficha, parte da base completa da Receita: situação e motivo, regime com
 * as datas (entrada e saída do Simples e do MEI), atividades secundárias
 * e todos os estabelecimentos da mesma raiz (matriz e filiais).
 */
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Buildings } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { brl, cnpjMascara, dataBr, telefoneFmt } from "@/lib/formato";
import { Esqueleto, Selo, Superficie } from "./ui";

const ROT_FONTE: Record<string, string> = {
  ecf_regime: "Regime (ECF)", sisen: "Benefício fiscal", incentivo: "Incentivo no IRPJ", parcelamento: "Parcelamento na Receita",
  ceis: "Sanção CEIS", cnep: "Sanção CNEP", lista_suja: "Cadastro de empregadores (MTE)", lei_do_bem: "Lei do Bem", anp: "ANP", rntrc: "RNTRC",
};
const ROT_TIPO: Record<string, string> = {
  real: "Lucro Real", presumido: "Lucro Presumido", arbitrado: "Lucro Arbitrado", imune_isenta: "imune/isenta", pat: "PAT",
  empresa_cidada: "Empresa Cidadã", simples: "Simples Nacional", mei: "MEI", ordinario: "ordinário", aprovada: "incentivo aprovado",
  posto_combustivel: "posto de combustível",
};
const SIT: Record<number, string> = { 1: "nula", 2: "ativa", 3: "suspensa", 4: "inapta", 8: "baixada" };

export function FichaBase({ cnpj }: { cnpj: string }) {
  const b = useQuery({ queryKey: ["empresa-base", cnpj], queryFn: () => api<any>(`/empresas/${cnpj}/base`), staleTime: 600_000 });
  const [todas, setTodas] = useState(false);
  if (b.isLoading) return <Esqueleto className="h-40" />;
  const d = b.data;
  if (!d?.estab && !d?.filiais?.length) return null;
  const e = d.estab;
  const fil = todas ? d.filiais : d.filiais.slice(0, 8);
  const regime = e && [
    e.opcao_mei ? `MEI desde ${dataBr(e.data_opcao_mei)}` : e.data_exclusao_mei ? `Saiu do MEI em ${dataBr(e.data_exclusao_mei)}` : null,
    e.opcao_simples ? `Simples desde ${dataBr(e.data_opcao_simples)}` : e.data_exclusao_simples ? `Excluída do Simples em ${dataBr(e.data_exclusao_simples)}` : "Fora do Simples",
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      {e && (
        <Superficie titulo="Situação e regime">
          <dl className="divide-y divide-linha text-sm">
            <div className="grid grid-cols-[110px_1fr] gap-2 px-4 py-2"><dt className="text-xs text-aco">Situação</dt>
              <dd className="text-[13px]"><Selo tom={e.situacao === 2 ? "ok" : "perigo"}>{SIT[e.situacao] ?? "?"}</Selo> desde {dataBr(e.data_situacao)}{e.motivo && e.motivo_situacao > 0 && ` · ${e.motivo.toLowerCase()}`}{e.situacao_especial && ` · ${e.situacao_especial}`}</dd></div>
            <div className="grid grid-cols-[110px_1fr] gap-2 px-4 py-2"><dt className="text-xs text-aco">Regime</dt><dd className="text-[13px]">{regime?.join(" · ")}</dd></div>
            {d.secundarios.length > 0 && (
              <div className="grid grid-cols-[110px_1fr] gap-2 px-4 py-2"><dt className="text-xs text-aco">Atividades secundárias</dt>
                <dd><ul className="space-y-0.5 text-[13px]">{d.secundarios.map((c: any) => <li key={c.codigo}><span className="font-mono text-xs tabular text-aco">{c.codigo}</span> {c.descricao}</li>)}</ul></dd></div>
            )}
            {d.marcas?.length > 0 && (
              <div className="grid grid-cols-[110px_1fr] gap-2 px-4 py-2"><dt className="text-xs text-aco">Bases públicas</dt>
                <dd><ul className="space-y-0.5 text-[13px]">{d.marcas.map((m: any, i: number) => (
                  <li key={i}><span className="text-xs text-aco">{ROT_FONTE[m.fonte] ?? m.fonte}:</span> {ROT_TIPO[m.tipo] ?? m.tipo.toLowerCase()}
                    {m.ano && <span className="text-aco"> ({m.ano})</span>}{m.valor != null && Number(m.valor) > 0 && <span className="font-mono text-xs"> · {brl(Number(m.valor))}</span>}
                    {m.detalhe?.fim && <span className="text-xs text-aco"> · até {dataBr(m.detalhe.fim)}</span>}</li>
                ))}</ul></dd></div>
            )}
            {(e.email_contador || e.telefone_contador) && (
              <p className="px-4 py-2 text-xs text-aco">O {[e.email_contador && "e-mail", e.telefone_contador && "telefone"].filter(Boolean).join(" e o ")} do cadastro aparece em várias empresas: provavelmente é do escritório de contabilidade.</p>
            )}
          </dl>
        </Superficie>
      )}
      {d.total_estab > 1 && (
        <Superficie titulo={<span className="flex items-center gap-1.5"><Buildings size={15} /> Matriz e filiais · {d.total_estab} ({d.ativos} ativas)</span>}>
          <ul className="divide-y divide-linha">
            {fil.map((f: any) => (
              <li key={f.cnpj}>
                <Link href={`/app/empresas/${f.cnpj}`} className={`flex items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-acento-fundo/40 ${f.cnpj === cnpj ? "bg-acento-fundo/40" : ""}`}>
                  <span className="min-w-0">
                    <span className="block font-mono text-xs tabular">{cnpjMascara(f.cnpj)} {f.matriz && <Selo>matriz</Selo>}</span>
                    <span className="block truncate text-xs text-aco">{[f.nome_fantasia, f.bairro, `${f.municipio}/${f.uf}`, telefoneFmt(f.telefone)].filter(Boolean).join(" · ")}</span>
                  </span>
                  <Selo tom={f.situacao === 2 ? "ok" : "perigo"}>{SIT[f.situacao] ?? "?"}</Selo>
                </Link>
              </li>
            ))}
          </ul>
          {d.filiais.length > 8 && (
            <button type="button" onClick={() => setTodas(!todas)} className="w-full cursor-pointer border-t border-linha py-2 text-xs text-acento hover:underline">
              {todas ? "Mostrar menos" : `Ver todas (${d.filiais.length}${d.total_estab > d.filiais.length ? ` de ${d.total_estab}` : ""})`}
            </button>
          )}
        </Superficie>
      )}
    </div>
  );
}
