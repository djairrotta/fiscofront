"use client";
/** Mapa: estados em cartograma e, ao escolher um, as cidades com mais divida. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, qs } from "@/lib/api";
import { brl, num } from "@/lib/formato";
import { MapaUfs } from "@/componentes/app/Graficos";
import { AvisoErro, Esqueleto, Superficie, Vazio } from "@/componentes/app/ui";

export default function Mapa() {
  const router = useRouter();
  const [uf, setUf] = useState<string | null>("SP");
  const ufs = useQuery({ queryKey: ["ufs"], queryFn: () => api<any[]>("/ufs") });
  const mun = useQuery({ queryKey: ["municipios", uf], queryFn: () => api<any[]>(`/ufs/${uf}/municipios`), enabled: !!uf });
  const dadosMapa = (ufs.data ?? []).map((u) => ({ uf: u.uf, valor_total: u.divida_total, empresas: u.empresas_com_divida }));
  const atual = ufs.data?.find((u) => u.uf === uf);

  return (
    <div className="mx-auto max-w-[1200px] p-5 md:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Mapa</h1>
      <p className="mt-0.5 text-sm text-aco">Escolha um estado para ver as cidades. Clique numa cidade para abrir a pesquisa filtrada.</p>
      <div className="mt-4"><AvisoErro erro={ufs.error} /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[380px_1fr]">
        <Superficie titulo="Estados">
          <div className="p-4">{ufs.data ? <MapaUfs dados={dadosMapa} selecionada={uf} aoEscolher={setUf} /> : <Esqueleto className="h-80" />}</div>
          {atual && (
            <div className="grid grid-cols-2 gap-px border-t border-linha bg-linha">
              <div className="bg-papel px-4 py-3"><p className="text-xs text-aco">Dívida em {uf}</p><p className="font-mono font-semibold tabular">{brl(atual.divida_total, true)}</p></div>
              <div className="bg-papel px-4 py-3"><p className="text-xs text-aco">Empresas</p><p className="font-mono font-semibold tabular">{num(atual.empresas_com_divida)}</p></div>
            </div>
          )}
        </Superficie>
        <Superficie titulo={uf ? `Cidades de ${uf}` : "Cidades"}>
          {!uf ? <div className="p-4"><Vazio titulo="Escolha um estado" /></div>
            : mun.isLoading ? <div className="p-4"><Esqueleto className="h-80" /></div>
            : mun.data?.length ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-linha text-left text-xs text-aco">
                  <th className="px-4 py-2 font-medium">Cidade</th><th className="py-2 text-right font-medium">Devedoras</th>
                  <th className="py-2 text-right font-medium">Mediana</th><th className="px-4 py-2 text-right font-medium">Total</th></tr></thead>
                <tbody>
                  {mun.data.slice(0, 100).map((m) => (
                    <tr key={m.municipio_ibge} className="cursor-pointer border-b border-linha last:border-0 hover:bg-acento-fundo/40"
                      onClick={() => router.push(`/app/pesquisa${qs({ municipio: m.municipio_ibge })}`)}>
                      <td className="px-4 py-2">{m.municipio}</td>
                      <td className="py-2 text-right font-mono tabular">{num(m.empresas_com_divida)}</td>
                      <td className="py-2 text-right font-mono tabular text-aco">{brl(m.divida_mediana, true)}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold tabular">{brl(m.divida_total, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4"><Vazio titulo="Cidades aparecem depois da carga do cadastro da Receita"
                texto="A PGFN publica a dívida por estado, não por cidade. A cidade de cada empresa vem do cadastro de CNPJ da Receita, carregado uma vez por mês." /></div>
            )}
        </Superficie>
      </div>
    </div>
  );
}
