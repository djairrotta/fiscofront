export const ROT_STATUS: Record<string, [string, "ok" | "alerta" | "perigo" | "neutro" | "acento"]> = {
  rascunho: ["rascunho", "neutro"], preparada: ["pronta para enviar", "acento"], enviando: ["enviando", "ok"],
  pausada: ["pausada", "alerta"], concluida: ["concluída", "ok"], cancelada: ["cancelada", "perigo"],
};
export const VARIAVEIS: [string, string][] = [
  ["empresa", "Nome da empresa"], ["cidade", "Cidade"], ["atividade", "Atividade"], ["socio", "1º nome do sócio"], ["uf", "UF"], ["cnpj", "CNPJ"],
];
