/**
 * O mínimo de um imóvel para o catálogo saber em quais páginas ele aparece.
 * Espelho de `RegistroImovel` em catalogo-cirlene/lib/revalidacao.ts.
 */
export interface RegistroImovel {
  slug: string;
  categoria: string;
  subcategoria: string;
  cidade: string;
  uf: string;
  incorporadora?: string | null;
}

/**
 * Avisa o catálogo que estes imóveis mudaram (o estado antes e depois da
 * escrita). O catálogo invalida SÓ as páginas onde eles aparecem — revalidação
 * sob demanda e cirúrgica, o padrão do time desde a queda do MOVRA (23/10).
 */
export async function sincronizarCatalogo(imoveis: RegistroImovel[]) {
  const catalogoUrl = process.env.NEXT_PUBLIC_CATALOGO_URL || "http://localhost:3000";
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!secret) {
    console.warn("[sync] REVALIDATE_SECRET não configurado; revalidação ignorada.");
    return { ok: false, motivo: "sem-segredo" as const };
  }

  try {
    const res = await fetch(new URL("/api/revalidate", catalogoUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ imoveis }),
      // Não segura o painel se o catálogo estiver fora: o banco já foi gravado.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[sync] Catálogo respondeu ${res.status} ao revalidar.`);
      return { ok: false, motivo: `http-${res.status}` };
    }
    const { rotas } = (await res.json()) as { rotas?: string[] };
    console.log(`[sync] Catálogo revalidado: ${rotas?.length ?? 0} rotas.`);
    return { ok: true, rotas };
  } catch {
    // Fail-soft: o banco já foi atualizado; a rede de 1 dia do catálogo cobre.
    return { ok: false, motivo: "catalogo-fora" as const };
  }
}
