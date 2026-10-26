import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem o Supabase configurado o painel FECHA (não abre sem login): foi assim
  // que /admin respondeu 200 a qualquer um no deploy sem envs (23/10).
  if (!url || !anonKey) {
    if (req.nextUrl.pathname.startsWith("/admin")) {
      return new NextResponse("Painel sem configuração do Supabase.", { status: 503 });
    }
    return NextResponse.next();
  }

  let resposta = NextResponse.next({ request: req });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => req.cookies.set(name, value));
        resposta = NextResponse.next({ request: req });
        lista.forEach(({ name, value, options }) =>
          resposta.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ehRotaLogin = req.nextUrl.pathname.startsWith("/login");
  const ehRotaAdmin = req.nextUrl.pathname.startsWith("/admin");

  if (!user && ehRotaAdmin) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Conta logada sem papel 'admin' (o Auth aceita cadastro por e-mail):
  // a página de edição lê com a service role, então barra aqui.
  if (user && ehRotaAdmin) {
    const { data: admin } = await supabase.rpc("is_admin");
    if (admin !== true) {
      return new NextResponse("Sem acesso ao painel", { status: 403 });
    }
  }

  if (user && ehRotaLogin) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return resposta;
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
