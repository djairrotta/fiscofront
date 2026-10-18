"use client";
/**
 * Importar lista de CNPJs (colar ou subir CSV/TXT): a lista vira um filtro
 * da pesquisa de empresas, com todos os outros filtros, gráficos e
 * exportação. Dá para mandar a lista para a pesquisa na internet (site,
 * telefone e e-mail que a empresa publica), uma empresa por vez.
 */
import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Globe, ListBullets, MagnifyingGlass, Target, Trash, UploadSimple } from "@phosphor-icons/react";
import { api, qs } from "@/lib/api";
import { useRouter } from "next/navigation";
import { num } from "@/lib/formato";
import { AvisoErro, Botao, Campo, Rotulo, Superficie, Vazio } from "@/componentes/app/ui";

export default function Listas() {
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  const [nome, setNome] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const arq = useRef<HTMLInputElement>(null);
  const listas = useQuery({ queryKey: ["listas"], queryFn: () => api<any[]>("/listas") });
  const fila = useQuery({ queryKey: ["fila-internet"], queryFn: () => api<any>("/fila-internet"), refetchInterval: 30_000 });

  const importar = useMutation({
    mutationFn: () => api<any>("/listas", { method: "POST", json: { nome, texto } }),
    onSuccess: (l) => {
      setMsg(`"${l.nome}": ${num(l.total)} CNPJs válidos (${num(l.na_base)} encontrados na base)${l.invalidos ? `, ${l.invalidos} com dígito errado ignorados` : ""}.`);
      setTexto(""); setNome(""); qc.invalidateQueries({ queryKey: ["listas"] });
    },
  });
  const enriquecer = useMutation({
    mutationFn: (id: string) => api<any>(`/listas/${id}/enriquecer`, { method: "POST", json: {} }),
    onSuccess: (r) => {
      setMsg(`${num(r.enfileiradas)} empresas na fila da pesquisa na internet (até ${r.por_dia} por dia).${r.configurado ? "" : " O serviço de pesquisa ainda não está configurado: a fila anda quando estiver."}`);
      qc.invalidateQueries({ queryKey: ["listas"] }); qc.invalidateQueries({ queryKey: ["fila-internet"] });
    },
  });
  const router = useRouter();
  const ideal = useMutation({
    mutationFn: (id: string) => api<any>(`/listas/${id}/perfil`),
    onSuccess: (r) => { if (!Object.keys(r.filtros).length) { setMsg(r.explicacao || "A lista não tem um padrão forte o bastante."); return; } router.push(`/app/pesquisa${qs({ ...r.filtros, divida: "" })}`); },
  });
  const monitorar = useMutation({
    mutationFn: ({ id, v }: { id: string; v: boolean }) => api(`/listas/${id}/monitorar`, { method: "PUT", json: { monitorar: v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listas"] }),
  });
  const apagar = useMutation({ mutationFn: (id: string) => api(`/listas/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["listas"] }) });

  const lerArquivo = async (f: File) => {
    if (/\.xlsx?$/i.test(f.name)) { setMsg("Planilha: salve como CSV (Arquivo → Salvar como → CSV) e suba de novo."); return; }
    setTexto(await f.text());
    if (!nome) setNome(f.name.replace(/\.[^.]+$/, ""));
  };

  return (
    <div className="mx-auto max-w-[1100px] p-5 md:p-8">
      <Link href="/app/pesquisa" className="inline-flex items-center gap-1 text-sm text-aco hover:text-tinta"><ArrowLeft size={14} /> Pesquisa de empresas</Link>
      <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold tracking-tight"><ListBullets size={20} /> Listas importadas</h1>
      <p className="mt-0.5 text-sm text-aco">Cole CNPJs da sua carteira ou de outra fonte. A lista vira filtro da pesquisa: dá para cruzar com dívida, regime, contato e exportar.</p>
      {msg && <p className="mt-3 rounded-lg bg-acento-fundo px-3 py-2 text-sm" role="status">{msg}</p>}
      <AvisoErro erro={importar.error || enriquecer.error} />

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_380px]">
        <Superficie titulo="Nova lista">
          <form className="space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); importar.mutate(); }}>
            <div><Rotulo>Nome</Rotulo><Campo value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Clientes do escritório" /></div>
            <div>
              <Rotulo>CNPJs</Rotulo>
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={10}
                placeholder={"Um por linha, com ou sem pontuação. Raiz de 8 dígitos vira a matriz.\n11.222.333/0001-81\n33000167000101"}
                className="w-full rounded-lg border border-linha bg-papel px-3 py-2 font-mono text-[13px] outline-none focus:border-acento" />
              <p className="mt-1 text-xs text-aco">Pode colar a coluna inteira de uma planilha; o resto do texto é ignorado. Até 50 mil.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={arq} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && lerArquivo(e.target.files[0])} />
              <Botao type="button" onClick={() => arq.current?.click()}><UploadSimple size={14} /> Subir CSV ou TXT</Botao>
              <Botao type="submit" variante="primario" disabled={!texto.trim() || importar.isPending}>{importar.isPending ? "Importando…" : "Importar lista"}</Botao>
            </div>
          </form>
        </Superficie>

        <Superficie titulo="Pesquisa na internet (fila)">
          <div className="space-y-1 p-4 text-sm">
            {fila.data ? (
              <>
                <p><b className="font-mono tabular">{num(fila.data.pendentes)}</b> na fila · <b className="font-mono tabular">{num(fila.data.feitas)}</b> feitas · {num(fila.data.erros)} sem resultado</p>
                <p className="text-aco">Hoje: {num(fila.data.hoje)} de {fila.data.por_dia} por dia.</p>
                {!fila.data.configurado && <p className="text-amber-700 dark:text-amber-300">Serviço de pesquisa não configurado (falta a chave do OpenRouter no fiscojev).</p>}
              </>
            ) : <p className="text-aco">…</p>}
            <p className="pt-2 text-xs text-aco">O robô abre o site da própria empresa e traz telefone, e-mail e redes que ela publica, com o link de onde saiu. Aparece na ficha da empresa.</p>
          </div>
        </Superficie>
      </div>

      <h2 className="mt-8 text-sm font-semibold">Suas listas</h2>
      <ul className="mt-2 divide-y divide-linha rounded-[10px] border border-linha bg-papel">
        {listas.data?.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">{l.nome}</p>
              <p className="text-xs text-aco">{num(l.total)} CNPJs · {new Date(l.criado_em).toLocaleDateString("pt-BR")}
                {Number(l.fila_pendente) > 0 && ` · ${num(l.fila_pendente)} na fila da internet`}{Number(l.fila_feito) > 0 && ` · ${num(l.fila_feito)} pesquisadas`}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <label className="mr-1 flex cursor-pointer items-center gap-1.5 text-xs" title="Avisa no painel e por e-mail quando muda a situação, o regime ou a dívida federal de uma empresa da lista">
                <input type="checkbox" checked={!!l.monitorar} disabled={monitorar.isPending} onChange={(e) => monitorar.mutate({ id: l.id, v: e.target.checked })} /> Monitorar
              </label>
              <Link href={`/app/pesquisa?lista=${l.id}&situacao=todas`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-acento px-3 text-[13px] font-medium text-white hover:opacity-90"><MagnifyingGlass size={13} /> Pesquisar</Link>
              <Botao tamanho="p" disabled={ideal.isPending} onClick={() => ideal.mutate(l.id)} title="Pesquisa empresas parecidas com as da lista (atividade, região, porte, regime)"><Target size={13} /> Cliente ideal</Botao>
              <Botao tamanho="p" disabled={enriquecer.isPending} onClick={() => enriquecer.mutate(l.id)}><Globe size={13} /> Pesquisar na internet</Botao>
              <Botao tamanho="p" variante="fantasma" aria-label={`Apagar ${l.nome}`} onClick={() => apagar.mutate(l.id)}><Trash size={13} /></Botao>
            </div>
          </li>
        ))}
      </ul>
      {listas.data?.length === 0 && <div className="mt-2"><Vazio titulo="Nenhuma lista ainda" texto="Importe a primeira acima." /></div>}
    </div>
  );
}
