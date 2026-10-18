"use client";
/** Empresas semelhantes: monta a pesquisa (mesma atividade, região e porte) e abre. */
import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, qs } from "@/lib/api";
import { AvisoErro, Esqueleto } from "@/componentes/app/ui";

export default function Semelhantes({ params }: { params: Promise<{ cnpj: string }> }) {
  const { cnpj } = use(params);
  const router = useRouter();
  const s = useQuery({ queryKey: ["semelhantes", cnpj], queryFn: () => api<any>(`/ia/semelhantes/${cnpj}`) });
  useEffect(() => { if (s.data) router.replace(`/app/pesquisa${qs(s.data.filtros)}`); }, [s.data, router]);
  return <div className="p-8">{s.error ? <AvisoErro erro={s.error} /> : <Esqueleto className="h-24" />}</div>;
}
