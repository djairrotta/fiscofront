import { NextResponse, type NextRequest } from "next/server";

/**
 * /app so abre com sessao. Antes disto a area logada nao existia: qualquer
 * um abria /app direto.
 *
 * O middleware so confere a PRESENCA do cookie; quem valida assinatura e
 * expiracao e a API a cada chamada. Verificar JWT aqui exigiria o segredo
 * no edge e daria falsa sensacao de seguranca.
 */
export function middleware(req: NextRequest) {
  const tem = req.cookies.has("fisco_sessao");
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/app") && !tem) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = `?destino=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (pathname === "/entrar" && tem) {
    const url = req.nextUrl.clone();
    url.pathname = "/app"; url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/app", "/entrar"] };
