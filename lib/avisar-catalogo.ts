import type { RegistroImovel } from "@/lib/sync";

type Parcial = Partial<RegistroImovel> | null | undefined;

/**
 * O ÚNICO jeito de avisar o catálogo depois de gravar. Toda escrita do painel
 * (salvar, publicar/ocultar, ordem, excluir) chama isto com o imóvel ANTES e
 * DEPOIS — assim exclusão e troca de slug também limpam a página antiga.
 * Fire-and-forget: o banco já foi gravado; falha aqui não trava a tela.
 */
export function avisarCatalogo(...estados: Parcial[]) {
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
  if (imoveis.length === 0) return;

  fetch("/api/revalidate-catalogo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imoveis }),
  }).catch(() => {});
}
