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

/** CNPJ com pontuacao. Aceita o alfanumerico (julho/2026): mesma mascara. */
export const cnpjMascara = (c?: string | null) => {
  const v = (c || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  return v.length === 14 ? `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}` : v;
};

export const telefoneFmt = (t?: string | null) => {
  const d = (t || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t || "";
};

/** Celular brasileiro: DDD + 9 + 8 digitos. So celular tem WhatsApp provavel. */
export const ehCelular = (t?: string | null) => /^\d{2}9\d{8}$/.test((t || "").replace(/\D/g, ""));

export const dataBr = (d?: string | null) => {
  if (!d) return "";
  const [a, m, dia] = d.slice(0, 10).split("-");
  return a && m && dia ? `${dia}/${m}/${a}` : d;
};

export const desde = (d?: string | null) => {
  if (!d) return "";
  const anos = (Date.now() - new Date(d.slice(0, 10)).getTime()) / (365.25 * 864e5);
  return anos >= 1 ? `há ${Math.floor(anos)} ano${anos >= 2 ? "s" : ""}` : "há menos de 1 ano";
};

export const COR_FASE: Record<string, string> = {
  slate: "bg-slate-400", sky: "bg-sky-500", violet: "bg-violet-500", amber: "bg-amber-500",
  orange: "bg-orange-500", emerald: "bg-emerald-500", teal: "bg-teal-500", red: "bg-red-500",
  pink: "bg-pink-500", indigo: "bg-indigo-500",
};
