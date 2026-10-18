/**
 * Resumo legível dos filtros da pesquisa de empresas (cartões do
 * histórico, cabeçalho dos gráficos, nome sugerido ao salvar).
 */
const SIT: Record<string, string> = { 1: "nula", 2: "ativa", 3: "suspensa", 4: "inapta", 8: "baixada", todas: "todas as situações" };
const PORTE: Record<string, string> = { 1: "ME", 3: "EPP", 5: "demais portes" };
const REG: Record<string, string> = { mei: "MEI", simples: "Simples", demais: "fora do Simples" };
const SINAL: Record<string, string> = {
  nova_tri: "inscrição nova no trimestre", nova_12m: "inscrição nova em 12 meses", rescindiu: "acordo caiu",
  negociou: "negociou", ajuizou: "ajuizada no trimestre", cresceu: "dívida cresceu", caiu: "dívida caiu",
  quitou: "quitou inscrições", recorrente: "devedora há 2+ anos",
};
const br = (d: string) => d.split("-").reverse().join("/");
const lista = (v: string, m: Record<string, string>) => v.split(",").map((x) => m[x] ?? x).join(", ");

export function resumoFiltros(f: Record<string, string>, cidades?: Map<string, string>): string[] {
  const r: string[] = [];
  if (f.q) r.push(`"${f.q}"`);
  if (f.cnae) r.push(`CNAE ${f.cnae.split(",").join(", ")}${f.cnae_secundario === "1" ? " (+secundária)" : ""}`);
  if (f.secao) r.push(`seção ${f.secao}`);
  if (f.uf) r.push(f.uf.split(",").join(", "));
  if (f.municipio) r.push(f.municipio.split(",").map((c) => cidades?.get(c) ?? c).join(", "));
  if (f.raio_km) r.push(`raio de ${f.raio_km} km`);
  if (f.bairro) r.push(`bairro ${f.bairro}`);
  if (f.cep) r.push(`CEP ${f.cep}…`);
  if (f.hab_min || f.hab_max) r.push(`habitantes ${f.hab_min || 0}–${f.hab_max || "∞"}`);
  if (f.situacao) r.push(lista(f.situacao, SIT));
  if (f.situacao_de || f.situacao_ate) r.push(`situação ${f.situacao_de ? "de " + br(f.situacao_de) : ""} ${f.situacao_ate ? "até " + br(f.situacao_ate) : ""}`.trim());
  if (f.matriz) r.push(f.matriz === "matriz" ? "só matriz" : "só filiais");
  if (f.filiais_min) r.push(`${f.filiais_min}+ filiais`);
  if (f.natureza) r.push(f.natureza.replace(/g:/g, ""));
  if (f.abertura_de || f.abertura_ate) r.push(`aberta ${f.abertura_de ? "desde " + br(f.abertura_de) : ""} ${f.abertura_ate ? "até " + br(f.abertura_ate) : ""}`.trim());
  if (f.idade_min || f.idade_max) r.push(`${f.idade_min || 0}–${f.idade_max || "∞"} anos`);
  if (f.porte) r.push(lista(f.porte, PORTE));
  if (f.regime) r.push(lista(f.regime, REG));
  if (f.simples) r.push({ optante: "optante do Simples", excluido: "excluída do Simples", nao: "não optante" }[f.simples] ?? f.simples);
  if (f.mei) r.push({ sim: "é MEI", excluido: "saiu do MEI", nao: "não é MEI" }[f.mei] ?? f.mei);
  if (f.faturamento) r.push(`faturamento ${f.faturamento}`);
  if (f.capital_min || f.capital_max) r.push(`capital ${f.capital_min || 0}–${f.capital_max || "∞"}`);
  if (f.socios_min || f.socios_max) r.push(`${f.socios_min || 0}–${f.socios_max || "∞"} sócios`);
  if (f.recuperacao) r.push("recuperação judicial");
  if (f.contato) r.push(`com ${f.contato.split(",").join(", ")}`);
  if (f.ocultar_contador) r.push("sem contato do contador");
  if (f.email) r.push(`e-mail ${f.email}`);
  if (f.telefone) r.push(`telefone ${f.telefone}`);
  if (f.divida) r.push(f.divida === "com" ? "com dívida federal" : "sem dívida federal");
  if (f.valor_min || f.valor_max) r.push(`dívida ${f.valor_min || 0}–${f.valor_max || "∞"}`);
  if (f.tributo) r.push(f.tributo);
  if (f.sinal) r.push(lista(f.sinal, SINAL));
  if (f.ajuizada) r.push(f.ajuizada === "sim" ? "ajuizada" : "não ajuizada");
  if (f.acordo) r.push(`acordo: ${f.acordo}`);
  if (f.programa) r.push(`programa: ${f.programa}`);
  if (f.estadual) r.push("dívida estadual SP");
  return r;
}
