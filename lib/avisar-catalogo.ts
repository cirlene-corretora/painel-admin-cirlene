import type { RegistroImovel } from "@/lib/sync";

type Parcial = Partial<RegistroImovel> | null | undefined;

/**
 * O ÚNICO jeito de avisar o catálogo depois de gravar. Toda escrita do painel
 * (salvar, publicar/ocultar, ordem, excluir) chama isto com o imóvel ANTES e
 * DEPOIS — assim exclusão e troca de slug também limpam a página antiga.
 * Devolve se o catálogo confirmou. Falha aqui não desfaz nada: o banco já foi
 * gravado e o catálogo se atualiza sozinho em até 24 h.
 */
export async function avisarCatalogo(...estados: Parcial[]): Promise<boolean> {
  const imoveis = estados
    .filter((e): e is Partial<RegistroImovel> => Boolean(e?.slug && e.categoria && e.subcategoria))
    .map((e) => ({
      slug: e.slug!,
      categoria: e.categoria!,
      subcategoria: e.subcategoria!,
      cidade: e.cidade ?? "",
      uf: e.uf ?? "",
      incorporadora: e.incorporadora ?? null,
    }));
  if (imoveis.length === 0) return false;

  try {
    const res = await fetch("/api/revalidate-catalogo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imoveis }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
