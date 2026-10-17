/**
 * Ponte autenticada para a API.
 *
 * O painel roda no navegador, mas o token mora num cookie httpOnly que o
 * JavaScript da pagina nao le (de proposito: XSS nao rouba sessao). Toda
 * chamada do painel passa por aqui: o servidor do Next le o cookie, poe o
 * Bearer e repassa. So caminhos /api/... sao aceitos, e o endereco interno
 * da API nunca chega ao cliente.
 */
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const API = process.env.API_URL ?? "http://funciona_fiscoback:3000/api";
const COOKIE = "fisco_sessao";

async function repassar(req: NextRequest, ctx: { params: Promise<{ rota: string[] }> }) {
  const { rota } = await ctx.params;
  if (!rota?.length || rota.some((p) => p === ".." || p.includes("/"))) {
    return NextResponse.json({ erro: "Rota inválida." }, { status: 400 });
  }
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });

  const destino = `${API}/${rota.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const corpo = req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

  let r: Response;
  try {
    r = await fetch(destino, {
      method: req.method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(corpo ? { "content-type": req.headers.get("content-type") ?? "application/json" } : {}),
      },
      body: corpo || undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ erro: "Serviço indisponível no momento. Tente em instantes." }, { status: 503 });
  }

  const tipo = r.headers.get("content-type") ?? "application/json";
  const cab: Record<string, string> = { "content-type": tipo, "cache-control": "no-store" };
  const disp = r.headers.get("content-disposition");
  if (disp) cab["content-disposition"] = disp;

  const resp = new NextResponse(r.body, { status: r.status, headers: cab });
  // Token vencido ou invalido: limpa o cookie para o middleware mandar ao login.
  if (r.status === 401) resp.cookies.delete(COOKIE);
  return resp;
}

export { repassar as GET, repassar as POST, repassar as PATCH, repassar as PUT, repassar as DELETE };
