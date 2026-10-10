"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CATEGORIAS_CONFIG, formatarPreco } from "@/lib/taxonomia";
import { getUrlPublicaR2 } from "@/lib/r2";
import type { ImovelCompleto, SlugCategoria } from "@/lib/types";

export default function PainelAdminPage() {
  const [imoveis, setImoveis] = useState<ImovelCompleto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [filtroSubcategoria, setFiltroSubcategoria] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "publicados" | "ocultos">("todos");
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const carregarImoveis = async () => {
    setCarregando(true);
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("imoveis")
      .select("*, fotos:imovel_fotos(*)")
      .order("ordem", { ascending: true })
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao carregar imóveis:", error);
    } else {
      setImoveis((data as ImovelCompleto[]) || []);
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregarImoveis();
  }, []);

  // Notificação com auto-dismiss
  const mostrarSucesso = (msg: string) => {
    setMensagemSucesso(msg);
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  // Alternar visibilidade (Publicado / Oculto)
  const togglePublicado = async (imovel: ImovelCompleto) => {
    const novoStatus = !imovel.publicado;
    const supabase = getSupabaseBrowserClient();

    // Atualização otimista na interface
    setImoveis((prev) =>
      prev.map((i) => (i.id === imovel.id ? { ...i, publicado: novoStatus } : i))
    );

    const { error } = await supabase
      .from("imoveis")
      .update({ publicado: novoStatus })
      .eq("id", imovel.id);

    if (error) {
      console.error("Erro ao alterar visibilidade:", error);
      // Reverte
      setImoveis((prev) =>
        prev.map((i) => (i.id === imovel.id ? { ...i, publicado: imovel.publicado } : i))
      );
    } else {
      mostrarSucesso(
        novoStatus
          ? `"${imovel.titulo}" agora está VISÍVEL no catálogo!`
          : `"${imovel.titulo}" foi OCULTADO do catálogo (mantido no sistema).`
      );
      // Dispara revalidação no catálogo
      fetch("/api/revalidate-catalogo", {
        method: "POST",
        body: JSON.stringify({ slug: imovel.slug }),
      }).catch(() => {});
    }
  };

  // Confirmar e excluir imóvel
  const confirmarExclusao = async () => {
    if (!deletandoId) return;
    const supabase = getSupabaseBrowserClient();

    const imovel = imoveis.find((i) => i.id === deletandoId);

    const { error } = await supabase
      .from("imoveis")
      .delete()
      .eq("id", deletandoId);

    if (error) {
      console.error("Erro ao excluir imóvel:", error);
    } else {
      setImoveis((prev) => prev.filter((i) => i.id !== deletandoId));
      mostrarSucesso(`Imóvel "${imovel?.titulo || ""}" excluído permanentemente.`);
      // Dispara revalidação no catálogo
      fetch("/api/revalidate-catalogo", {
        method: "POST",
        body: JSON.stringify({ slug: imovel?.slug }),
      }).catch(() => {});
    }

    setDeletandoId(null);
  };

  // Subcategorias disponíveis para a categoria selecionada
  const subcategoriasDisponiveis = useMemo(() => {
    if (filtroCategoria === "todas") return [];
    const cat = CATEGORIAS_CONFIG.find((c) => c.slug === filtroCategoria);
    return cat ? cat.subcategorias : [];
  }, [filtroCategoria]);

  // Lista filtrada
  const imoveisFiltrados = useMemo(() => {
    return imoveis.filter((i) => {
      // Busca por texto
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const noTitulo = i.titulo.toLowerCase().includes(termo);
        const noBairro = (i.bairro || "").toLowerCase().includes(termo);
        const naCidade = (i.cidade || "").toLowerCase().includes(termo);
        const naIncorp = (i.incorporadora || "").toLowerCase().includes(termo);
        if (!noTitulo && !noBairro && !naCidade && !naIncorp) return false;
      }

      // Categoria
      if (filtroCategoria !== "todas") {
        if (filtroCategoria === "investimentos") {
          if (i.categoria !== "investimentos" && i.categoria !== "business") return false;
        } else if (i.categoria !== filtroCategoria) {
          return false;
        }
      }

      // Subcategoria
      if (filtroSubcategoria !== "todas" && i.subcategoria !== filtroSubcategoria) {
        return false;
      }

      // Status
      if (filtroStatus === "publicados" && !i.publicado) return false;
      if (filtroStatus === "ocultos" && i.publicado) return false;

      return true;
    });
  }, [imoveis, busca, filtroCategoria, filtroSubcategoria, filtroStatus]);

  // Métricas
  const totalImoveis = imoveis.length;
  const totalPublicados = imoveis.filter((i) => i.publicado).length;
  const totalOcultos = totalImoveis - totalPublicados;
  const totalDestaques = imoveis.filter((i) => i.destaque).length;

  return (
    <div className="space-y-8">
      {/* Mensagem Toast de Sucesso */}
      {mensagemSucesso && (
        <div className="fixed bottom-6 right-6 z-50 bg-cafe border border-ouro text-ouro-claro px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium">{mensagemSucesso}</span>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deletandoId && (
        <div className="fixed inset-0 z-50 bg-espresso/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cafe border border-red-500/40 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-serif text-ouro-claro font-semibold">
              Confirmar Exclusão
            </h3>
            <p className="text-xs text-creme/70 mt-2 leading-relaxed">
              Tem certeza que deseja remover este imóvel? Essa ação é permanente e ele será excluído tanto do painel quanto do catálogo da Cirlene.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeletandoId(null)}
                className="px-4 py-2 rounded-lg btn-secundario text-xs uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs uppercase tracking-wider font-semibold transition-colors"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho do Dashboard & Estatísticas */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-ouro-suave">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-ouro-claro font-semibold uppercase tracking-wide">
            Gerenciamento de Imóveis
          </h1>
          <p className="text-xs text-creme-mutado mt-1">
            Controle total do acervo: crie, edite, oculte ou remova anúncios em tempo real.
          </p>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-cafe/80 border border-ouro-suave px-4 py-3 rounded-xl">
            <span className="block text-[0.625rem] uppercase tracking-wider text-creme-mutado">
              Total Geral
            </span>
            <span className="text-xl font-serif font-bold text-creme">
              {totalImoveis}
            </span>
          </div>
          <div className="bg-cafe/80 border border-emerald-500/30 px-4 py-3 rounded-xl">
            <span className="block text-[0.625rem] uppercase tracking-wider text-emerald-400">
              No Catálogo
            </span>
            <span className="text-xl font-serif font-bold text-emerald-300">
              {totalPublicados}
            </span>
          </div>
          <div className="bg-cafe/80 border border-amber-500/30 px-4 py-3 rounded-xl">
            <span className="block text-[0.625rem] uppercase tracking-wider text-amber-400">
              Ocultos
            </span>
            <span className="text-xl font-serif font-bold text-amber-300">
              {totalOcultos}
            </span>
          </div>
          <div className="bg-cafe/80 border border-ouro px-4 py-3 rounded-xl">
            <span className="block text-[0.625rem] uppercase tracking-wider text-ouro">
              Destaques
            </span>
            <span className="text-xl font-serif font-bold text-ouro-claro">
              {totalDestaques}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-cafe/60 border border-ouro-suave p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Campo de Busca */}
          <div className="md:col-span-5">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título, bairro, cidade, incorporadora..."
              className="w-full input-luxury text-xs"
            />
          </div>

          {/* Filtro de Categoria */}
          <div className="md:col-span-3">
            <select
              value={filtroCategoria}
              onChange={(e) => {
                setFiltroCategoria(e.target.value);
                setFiltroSubcategoria("todas");
              }}
              className="w-full input-luxury text-xs"
            >
              <option value="todas">Todas as Categorias</option>
              {CATEGORIAS_CONFIG.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.titulo}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Subcategoria */}
          <div className="md:col-span-2">
            <select
              value={filtroSubcategoria}
              onChange={(e) => setFiltroSubcategoria(e.target.value)}
              disabled={filtroCategoria === "todas"}
              className="w-full input-luxury text-xs disabled:opacity-40"
            >
              <option value="todas">Subcategorias</option>
              {subcategoriasDisponiveis.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.titulo}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Status */}
          <div className="md:col-span-2">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="w-full input-luxury text-xs"
            >
              <option value="todos">Status: Todos</option>
              <option value="publicados">Apenas Publicados</option>
              <option value="ocultos">Apenas Ocultos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listagem de Imóveis */}
      {carregando ? (
        <div className="py-20 text-center">
          <div className="size-10 border-2 border-ouro border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs uppercase tracking-widest text-creme-mutado">
            Carregando acervo de imóveis...
          </p>
        </div>
      ) : imoveisFiltrados.length === 0 ? (
        <div className="py-16 text-center bg-cafe/40 border border-dashed border-ouro-suave rounded-2xl p-8">
          <p className="text-sm text-creme/60">
            Nenhum imóvel encontrado para os filtros selecionados.
          </p>
          <button
            onClick={() => {
              setBusca("");
              setFiltroCategoria("todas");
              setFiltroSubcategoria("todas");
              setFiltroStatus("todos");
            }}
            className="mt-4 px-4 py-2 rounded-lg btn-secundario text-xs uppercase tracking-wider"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {imoveisFiltrados.map((imovel) => {
            const fotoCapa =
              imovel.fotos?.find((f) => f.is_capa) || imovel.fotos?.[0];
            const fotoUrl = fotoCapa
              ? getUrlPublicaR2(fotoCapa.key)
              : "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80";

            return (
              <div
                key={imovel.id}
                className={`bg-cafe border rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:border-ouro/50 ${
                  imovel.publicado
                    ? "border-ouro-suave shadow-lg"
                    : "border-zinc-800 opacity-80 bg-zinc-950/40"
                }`}
              >
                {/* Capa do Imóvel */}
                <div className="relative h-48 w-full bg-espresso overflow-hidden group">
                  <img
                    src={fotoUrl}
                    alt={imovel.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Badges sobre a foto */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-full text-[0.625rem] uppercase tracking-wider font-semibold bg-espresso/80 backdrop-blur-md text-ouro-claro border border-ouro/30">
                      {imovel.categoria}
                    </span>
                    {imovel.destaque && (
                      <span className="px-2.5 py-1 rounded-full text-[0.625rem] uppercase tracking-wider font-semibold bg-ouro text-espresso">
                        ★ Destaque
                      </span>
                    )}
                  </div>

                  {/* Status Toggle Rápido na Capa */}
                  <button
                    onClick={() => togglePublicado(imovel)}
                    title={
                      imovel.publicado
                        ? "Clique para OCULTAR este imóvel do catálogo"
                        : "Clique para PUBLICAR este imóvel no catálogo"
                    }
                    className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[0.625rem] uppercase tracking-wider font-semibold backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      imovel.publicado
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900"
                        : "bg-zinc-900/85 text-zinc-400 border border-zinc-700 hover:bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        imovel.publicado ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                      }`}
                    />
                    {imovel.publicado ? "Publicado" : "Oculto"}
                  </button>

                  {/* Preço sobre a base da foto */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-espresso via-espresso/60 to-transparent p-3 pt-6 flex justify-between items-end">
                    <span className="text-sm font-semibold text-creme font-serif">
                      {formatarPreco(imovel.preco, imovel.preco_unidade)}
                    </span>
                    {imovel.fotos && imovel.fotos.length > 0 && (
                      <span className="text-[0.625rem] text-creme/60">
                        📷 {imovel.fotos.length} foto(s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Conteúdo Textual do Card */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-lg text-ouro-claro font-semibold leading-snug line-clamp-1">
                      {imovel.titulo}
                    </h3>
                    <p className="text-xs text-creme-mutado mt-1 line-clamp-1">
                      {imovel.subcategoria} · {imovel.bairro ? `${imovel.bairro}, ` : ""}{imovel.cidade}/{imovel.uf}
                    </p>

                    {imovel.chamada && (
                      <p className="text-xs text-creme/75 mt-2 line-clamp-2 italic">
                        "{imovel.chamada}"
                      </p>
                    )}

                    {/* Especificações Rápidas */}
                    <div className="flex flex-wrap gap-2 text-[0.6875rem] text-creme/50 mt-3 pt-3 border-t border-ouro-suave/50">
                      {imovel.specs?.areaUtil ? (
                        <span>📐 {imovel.specs.areaUtil} m²</span>
                      ) : null}
                      {imovel.specs?.quartos ? (
                        <span>🛏 {imovel.specs.quartos} qts</span>
                      ) : null}
                      {imovel.specs?.suites ? (
                        <span>🚿 {imovel.specs.suites} suítes</span>
                      ) : null}
                      {imovel.specs?.vagas ? (
                        <span>🚗 {imovel.specs.vagas} vagas</span>
                      ) : null}
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="mt-5 pt-3 border-t border-ouro-suave flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/imovel/${imovel.id}`}
                        className="px-3 py-1.5 rounded-lg btn-secundario text-xs uppercase tracking-wider font-semibold hover:border-ouro"
                      >
                        Editar
                      </Link>

                      <a
                        href={`http://localhost:3000/imovel/${imovel.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-creme/50 hover:text-ouro-claro rounded-lg transition-colors"
                        title="Ver página no catálogo"
                      >
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </a>
                    </div>

                    <button
                      onClick={() => setDeletandoId(imovel.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Excluir imóvel"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
