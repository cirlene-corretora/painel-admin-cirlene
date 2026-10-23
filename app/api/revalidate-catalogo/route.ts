import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sincronizarCatalogo, type RegistroImovel } from "@/lib/sync";

export const dynamic = "force-dynamic";

/** Aceita só o formato esperado (o catálogo valida de novo do lado dele). */
function registroValido(x: unknown): x is RegistroImovel {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return ["slug", "categoria", "subcategoria", "cidade", "uf"].every(
    (k) => typeof r[k] === "string" && (r[k] as string).length > 0,
  );
}

export async function POST(req: NextRequest) {
  // Fora do matcher do middleware: o login é conferido aqui. Sem isto,
  // qualquer um invalidaria o cache do catálogo em loop (custo na Vercel).
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { imoveis?: unknown };
    const imoveis = Array.isArray(body.imoveis)
      ? body.imoveis.filter(registroValido).slice(0, 10)
      : [];
    if (imoveis.length === 0) {
      return NextResponse.json({ error: "Nenhum imóvel informado" }, { status: 400 });
    }

    const resultado = await sincronizarCatalogo(imoveis);
    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 502 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Erro na revalidação:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao acionar revalidação" },
      { status: 500 },
    );
  }
}
