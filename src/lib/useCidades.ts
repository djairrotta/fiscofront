"use client";
import { useQuery } from "@tanstack/react-query";
import { api, qs } from "@/lib/api";

/** Nomes "Cidade/UF" dos códigos IBGE usados num filtro (para o resumo). */
export function useNomesCidades(codigos?: string) {
  const ids = (codigos || "").split(",").filter(Boolean);
  const q = useQuery({
    queryKey: ["cidades-nomes", ids.join(",")], enabled: ids.length > 0, staleTime: Infinity,
    queryFn: () => api<any[]>(`/municipios${qs({ ids: ids.join(",") })}`).catch(() => []),
  });
  return new Map<string, string>((q.data ?? []).map((c: any) => [String(c.ibge), `${c.nome}/${c.uf}`]));
}
