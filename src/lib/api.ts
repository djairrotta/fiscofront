/**
 * Cliente do painel. Sempre pela ponte /api/b (ver app/api/b), nunca direto
 * na API: o token nao esta acessivel ao JavaScript da pagina.
 */
export class ErroApi extends Error {
  constructor(public status: number, mensagem: string, public dados?: any) {
    super(mensagem);
  }
}

export async function api<T = any>(caminho: string, opcoes: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...resto } = opcoes;
  const r = await fetch(`/api/b${caminho}`, {
    ...resto,
    headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...(resto.headers || {}) },
    body: json !== undefined ? JSON.stringify(json) : resto.body,
  });
  if (r.status === 401 && typeof window !== "undefined") {
    window.location.href = `/entrar?destino=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroApi(r.status, dados?.erro ?? `Erro ${r.status}`, dados);
  return dados as T;
}

/** Query string a partir de um objeto, ignorando vazios. */
export function qs(o: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) continue;
    p.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

/**
 * Posicao fracionaria para arrastar-e-soltar: o meio entre os vizinhos.
 * Um update por arrasto, sem reindexar a coluna.
 */
export function posicaoEntre(antes?: number | null, depois?: number | null): number {
  if (antes == null && depois == null) return 1000;
  if (antes == null) return (depois as number) - 1000;
  if (depois == null) return antes + 1000;
  return (antes + depois) / 2;
}
