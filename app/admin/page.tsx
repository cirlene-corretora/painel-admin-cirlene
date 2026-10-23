"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CATEGORIAS_CONFIG, formatarPreco } from "@/lib/taxonomia";
import type { ImovelCompleto, SlugCategoria } from "@/lib/types";
import { avisarCatalogo } from "@/lib/avisar-catalogo";

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
      avisarCatalogo(imovel);
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
      // O imóvel já saiu do banco: os campos dele dizem de onde limpar.
      avisarCatalogo(imovel);
    }

    setDeletandoId(null);
  };

  // Alterar ordem de exibição rapidamente
  const alterarOrdem = async (imovel: ImovelCompleto, delta: number) => {
    const ordemAtual = typeof imovel.ordem === "number" ? imovel.ordem : 0;
    const novaOrdem = Math.max(0, ordemAtual + delta);
    if (novaOrdem === ordemAtual) return;

    // Atualização otimista
    setImoveis((prev) =>
      prev
        .map((i) => (i.id === imovel.id ? { ...i, ordem: novaOrdem } : i))
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    );

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("imoveis")
      .update({ ordem: novaOrdem })
      .eq("id", imovel.id);

    if (error) {
      console.error("Erro ao alterar ordem:", error);
      carregarImoveis();
    } else {
      mostrarSucesso(`Posição de "${imovel.titulo}" ajustada para #${novaOrdem}.`);
      avisarCatalogo(imovel);
    }
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
        <div className="bg-cafe/70 border border-ouro-suave rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-ouro-suave/60 bg-espresso/80 text-[0.6875rem] uppercase tracking-wider text-creme-mutado font-semibold">
                  <th className="py-3.5 px-4 w-16 text-center">Ordem</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Imóvel / Empreendimento</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Categoria & Subcategoria</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Localização</th>
                  <th className="py-3.5 px-4 min-w-[130px]">Preço</th>
                  <th className="py-3.5 px-4 min-w-[120px] text-center">Status</th>
                  <th className="py-3.5 px-4 min-w-[180px] text-right">Ações CRUD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ouro-suave/30 text-xs">
                {imoveisFiltrados.map((imovel) => (
                  <tr
                    key={imovel.id}
                    className={`transition-colors hover:bg-espresso/60 ${
                      imovel.publicado ? "" : "opacity-75 bg-zinc-950/20"
                    }`}
                  >
                    {/* Ordem */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-espresso border border-ouro/25 rounded-md px-1.5 py-0.5">
                        <span className="font-mono text-[0.6875rem] text-ouro-claro font-semibold">
                          #{imovel.ordem ?? 0}
                        </span>
                        <div className="flex flex-col ml-0.5">
                          <button
                            type="button"
                            onClick={() => alterarOrdem(imovel, -1)}
                            className="text-[0.55rem] text-creme/60 hover:text-ouro-claro leading-none p-0.5 cursor-pointer"
                            title="Subir posição (mostrar antes)"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => alterarOrdem(imovel, 1)}
                            className="text-[0.55rem] text-creme/60 hover:text-ouro-claro leading-none p-0.5 cursor-pointer"
                            title="Descer posição (mostrar depois)"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Imóvel */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/imovel/${imovel.id}`}
                          className="font-serif text-sm font-semibold text-creme hover:text-ouro-claro transition-colors line-clamp-1"
                        >
                          {imovel.titulo}
                        </Link>
                        {imovel.destaque && (
                          <span className="px-1.5 py-0.5 rounded text-[0.5625rem] uppercase font-bold bg-ouro text-espresso shrink-0">
                            ★ Destaque
                          </span>
                        )}
                      </div>
                      <div className="text-[0.6875rem] text-creme/50 font-mono mt-0.5 flex items-center gap-2">
                        <span>/{imovel.slug}</span>
                        {imovel.incorporadora && (
                          <span className="text-ouro/80 font-sans">
                            · {imovel.incorporadora}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Categoria & Subcategoria */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-semibold uppercase tracking-wider bg-espresso text-ouro-claro border border-ouro/30">
                          {imovel.categoria}
                        </span>
                        <span className="text-[0.6875rem] text-creme-mutado capitalize">
                          {imovel.subcategoria}
                        </span>
                      </div>
                    </td>

                    {/* Localização */}
                    <td className="py-3.5 px-4 text-creme/80">
                      <span className="block font-medium">
                        {imovel.bairro || "—"}
                      </span>
                      <span className="text-[0.6875rem] text-creme-mutado">
                        {imovel.cidade}/{imovel.uf}
                      </span>
                    </td>

                    {/* Preço */}
                    <td className="py-3.5 px-4 font-serif font-semibold text-ouro-claro">
                      {formatarPreco(imovel.preco, imovel.preco_unidade)}
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => togglePublicado(imovel)}
                        title={
                          imovel.publicado
                            ? "Clique para OCULTAR este imóvel da vitrine"
                            : "Clique para PUBLICAR este imóvel na vitrine"
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.625rem] uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                          imovel.publicado
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900"
                            : "bg-zinc-900/85 text-zinc-400 border border-zinc-700 hover:bg-zinc-800"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            imovel.publicado
                              ? "bg-emerald-400 animate-pulse"
                              : "bg-zinc-500"
                          }`}
                        />
                        {imovel.publicado ? "Publicado" : "Oculto"}
                      </button>
                    </td>

                    {/* Ações CRUD */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`http://localhost:3000/imovel/${imovel.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-creme/60 hover:text-ouro-claro hover:bg-espresso transition-colors"
                          title="Visualizar no catálogo público"
                        >
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </a>

                        <Link
                          href={`/admin/imovel/${imovel.id}`}
                          className="px-2.5 py-1.5 rounded-lg btn-secundario text-[0.6875rem] uppercase tracking-wider font-semibold hover:border-ouro"
                        >
                          Editar
                        </Link>

                        <button
                          type="button"
                          onClick={() => setDeletandoId(imovel.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                          title="Excluir permanentemente"
                        >
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
