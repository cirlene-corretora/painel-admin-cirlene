import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Guarda das rotas /api/* (o middleware só cobre /admin e /login).
 * Devolve a resposta de erro, ou `null` se há sessão. Sem Supabase
 * configurado, FECHA — nunca libera por falta de env.
 */
export async function exigirLogin(): Promise<NextResponse | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Painel sem configuração do Supabase" }, { status: 503 });
  }
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  return null;
}
