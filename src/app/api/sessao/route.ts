/**
 * Ponte de sessao.
 *
 * O token NUNCA chega ao JavaScript da pagina: o navegador manda
 * e-mail e senha aqui, o servidor do Next fala com a API e guarda o JWT
 * num cookie httpOnly. Assim um XSS na landing nao rouba sessao, e o
 * endereco interno da API nao vaza para o cliente.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API = process.env.API_URL ?? "http://funciona_fiscoback:3000/api";
// Arquivo de rota do Next so aceita exports conhecidos (GET/POST/...),
// entao a constante do cookie nao pode ser exportada daqui.
const COOKIE = "fisco_sessao";

export async function POST(req: Request) {
  let corpo: any;
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }

  const rota = corpo?.acao === "registrar" ? "/auth/registrar" : "/auth/login";
  let r: Response;
  try {
    r = await fetch(`${API}${rota}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nome: corpo?.nome, oab: corpo?.oab,
        email: corpo?.email, senha: corpo?.senha,
      }),
      cache: "no-store",
    });
  } catch {
    // API fora nao pode virar erro de login: a mensagem tem que dizer a verdade.
    return NextResponse.json({ erro: "Serviço indisponível no momento. Tente em instantes." }, { status: 503 });
  }

  const dados = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json({ erro: dados?.erro ?? "Não foi possível entrar." }, { status: r.status });

  (await cookies()).set(COOKIE, dados.token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 12 * 60 * 60,
  });
  return NextResponse.json({ ok: true, usuario: dados.usuario });
}

export async function DELETE() {
  (await cookies()).delete(COOKIE);
  return NextResponse.json({ ok: true });
}
