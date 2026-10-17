import Link from "next/link";
import { listarUfs, listarFontes } from "@/lib/dados";
import { brl, num, posicao } from "@/lib/formato";

export const dynamic = "force-dynamic";

/** Visao geral. Densidade alta: numero e tabela, pouco espaco morto. */
export default async function Painel() {
  const [ufs, fontes] = await Promise.all([listarUfs(), listarFontes()]);
  const divida = ufs.reduce((s, u) => s + Number(u.divida_total || 0), 0);
  const devedoras = ufs.reduce((s, u) => s + Number(u.empresas_com_divida || 0), 0);
  const ref = ufs[0]?.data_referencia ?? null;
  const topo = [...ufs].sort((a, b) => Number(b.divida_total) - Number(a.divida_total)).slice(0, 8);

  return (
    <div className="p-5 md:p-8">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Visão geral</h1>
        <p className="text-xs text-aco">{posicao(ref)}</p>
      </header>

      <div className="mt-5 grid gap-px overflow-hidden rounded-[10px] border border-linha bg-linha sm:grid-cols-3">
        {[
          { r: "Dívida inscrita mapeada", v: brl(divida, true) },
          { r: "Empresas devedoras", v: num(devedoras) },
          { r: "Peças geradas no ciclo", v: "0 de 30" },
        ].map((x) => (
          <div key={x.r} className="bg-papel px-5 py-4">
            <p className="text-xs text-aco">{x.r}</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular">{x.v}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Onde há mais oportunidade</h2>
          <Link href="/app/mapa" className="text-xs text-acento hover:underline">Abrir o mapa</Link>
        </div>
        {topo.length === 0 ? (
          <div className="mt-3 rounded-[10px] border border-dashed border-linha p-8 text-center">
            <p className="text-sm font-medium">Nenhum dado carregado ainda</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-aco">
              Rode a carga da PGFN no backend e atualize as views. Os números aparecem aqui
              assim que a primeira base entrar.
            </p>
          </div>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-linha text-left text-xs text-aco">
                <th className="pb-2 font-medium">Estado</th>
                <th className="pb-2 text-right font-medium">Devedoras</th>
                <th className="pb-2 text-right font-medium">Inscrito</th>
              </tr>
            </thead>
            <tbody>
              {topo.map((u) => (
                <tr key={u.uf} className="border-b border-linha transition-colors hover:bg-acento-fundo/40">
                  <td className="py-2.5 font-medium">{u.uf}</td>
                  <td className="py-2.5 text-right font-mono tabular text-aco">{num(u.empresas_com_divida)}</td>
                  <td className="py-2.5 text-right font-mono tabular">{brl(u.divida_total, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Frescor das bases. Numero sem data de posicao nao vale nada para
          advogado: ele precisa saber de quando e o dado antes de ligar. */}
      {fontes.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold">Fontes de dados</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-linha text-left text-xs text-aco">
                <th className="pb-2 font-medium">Base</th>
                <th className="pb-2 font-medium">Periodicidade</th>
                <th className="pb-2 font-medium">Carregado</th>
                <th className="pb-2 font-medium">Publicado</th>
                <th className="pb-2 text-right font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {fontes.map((f) => {
                const atrasada = !!f.versao_disponivel && f.versao_carregada !== f.versao_disponivel;
                const situacao = f.ultimo_erro ? "falhou"
                  : f.periodicidade === "sob_demanda" ? "sob demanda"
                  : atrasada ? "atualização pendente"
                  : f.versao_carregada ? "em dia" : "não carregada";
                return (
                  <tr key={f.chave} className="border-b border-linha">
                    <td className="py-2.5 font-medium">{f.rotulo}</td>
                    <td className="py-2.5 text-aco">{f.periodicidade.replace("_", " ")}</td>
                    <td className="py-2.5 font-mono tabular text-aco">{f.versao_carregada ?? "-"}</td>
                    <td className="py-2.5 font-mono tabular text-aco">{f.versao_disponivel ?? "-"}</td>
                    <td className="py-2.5 text-right">
                      <span className={
                        situacao === "falhou" ? "text-red-700"
                        : situacao === "atualização pendente" ? "text-amber-700"
                        : situacao === "em dia" ? "text-emerald-700" : "text-aco"
                      }>{situacao}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
