/**
 * O selo nunca e opcional. Vender lead de tese derrotada expoe o assinante
 * e expoe o produto. A escala semantica e separada do petroleo da marca
 * justamente para nao competir com ele.
 */
export type Maturidade = "consolidada_favoravel" | "modulada" | "em_disputa" | "derrotada";

const MAPA: Record<Maturidade, { texto: string; cls: string }> = {
  consolidada_favoravel: { texto: "Consolidada favorável", cls: "bg-emerald-50 text-emerald-900 ring-emerald-200" },
  modulada:              { texto: "Modulada",              cls: "bg-amber-50 text-amber-900 ring-amber-200" },
  em_disputa:            { texto: "Em disputa",            cls: "bg-sky-50 text-sky-900 ring-sky-200" },
  derrotada:             { texto: "Derrotada",             cls: "bg-red-50 text-red-900 ring-red-200" },
};

export function SeloTese({ maturidade, verificadaEm }:
  { maturidade: Maturidade; verificadaEm?: string | null }) {
  const m = MAPA[maturidade];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${m.cls}`}>
      {m.texto}
      {verificadaEm && (
        <span className="opacity-70">
          conferida {new Date(verificadaEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
        </span>
      )}
    </span>
  );
}
