export const brl = (n: number, curto = false) => {
  const v = Number(n) || 0;
  if (curto) {
    if (v >= 1e9) return `R$ ${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`;
    if (v >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
    if (v >= 1e3) return `R$ ${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  }
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
};

export const num = (n: number) => (Number(n) || 0).toLocaleString("pt-BR");

export const cnpjFmt = (c: string) =>
  c?.length === 14
    ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
    : c;

/** A PGFN publica trimestralmente. Nenhuma cifra aparece sem isto. */
export const posicao = (d?: string | null) => {
  if (!d) return "";
  const dt = new Date(d);
  return `posição de ${Math.floor(dt.getMonth() / 3) + 1}º tri/${dt.getFullYear()}`;
};

export const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "")
   .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
