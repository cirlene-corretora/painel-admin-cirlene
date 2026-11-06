import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ImovelForm } from "@/components/ImovelForm";
import type { ImovelCompleto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditarImovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Com a sessão de quem está logado, passando pelo RLS: o painel não precisa
  // de chave de serviço em produção.
  const supabase = await getSupabaseServerClient();

  const { data: imovel, error } = await supabase
    .from("imoveis")
    .select("*, fotos:imovel_fotos(*)")
    .eq("id", id)
    .single();

  if (error || !imovel) {
    notFound();
  }

  // Ordena as fotos pelo campo ordem
  if (imovel.fotos && Array.isArray(imovel.fotos)) {
    imovel.fotos.sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
  }

  return <ImovelForm imovelInicial={imovel as ImovelCompleto} ehNovo={false} />;
}
