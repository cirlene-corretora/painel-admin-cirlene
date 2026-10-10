/**
 * Dispara revalidação em tempo real no catálogo
 */
export async function sincronizarCatalogo(slug?: string) {
  const catalogoUrl = process.env.NEXT_PUBLIC_CATALOGO_URL || "http://localhost:3000";
  const secret = process.env.REVALIDATE_SECRET || "cirlene-revalidate-secret-2026";

  try {
    const url = new URL("/api/revalidate", catalogoUrl);
    url.searchParams.set("secret", secret);
    url.searchParams.set("tag", "imoveis");
    if (slug) {
      url.searchParams.set("slug", slug);
    }

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // timeout rápido para não bloquear a resposta do painel se o catálogo estiver desligado
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      console.log(`[sync] Catálogo revalidado com sucesso para tag: imoveis${slug ? ` (${slug})` : ""}`);
    } else {
      console.warn(`[sync] Catálogo respondeu ${res.status} ao revalidar.`);
    }
  } catch {
    // Fail-soft: se o catálogo não estiver rodando no momento da ação, o banco já foi atualizado
    // e o catálogo lerá o dado novo assim que subir
  }
}
