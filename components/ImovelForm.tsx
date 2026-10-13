"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CATEGORIAS_CONFIG,
  STATUS_OBRA_CONFIG,
  UNIDADES_PRECO_CONFIG,
  COMODIDADES_PADRAO,
  getSubcategoriasPorCategoria,
} from "@/lib/taxonomia";
import { getUrlPublicaR2 } from "@/lib/r2";
import type { ImovelCompleto, FotoImovel, SlugCategoria, StatusObra, UnidadePreco } from "@/lib/types";

interface ImovelFormProps {
  imovelInicial?: Partial<ImovelCompleto>;
  ehNovo?: boolean;
}

export function ImovelForm({ imovelInicial, ehNovo = false }: ImovelFormProps) {
  const router = useRouter();

  // Dados básicos
  const [titulo, setTitulo] = useState(imovelInicial?.titulo || "");
  const [subtitulo, setSubtitulo] = useState(imovelInicial?.subtitulo || "");
  const [slug, setSlug] = useState(imovelInicial?.slug || "");
  const [artigo, setArtigo] = useState<"o" | "a">(imovelInicial?.artigo || "o");
  const [categoria, setCategoria] = useState<SlugCategoria>(
    imovelInicial?.categoria || "lancamentos"
  );
  const [subcategoria, setSubcategoria] = useState(
    imovelInicial?.subcategoria || "apartamentos"
  );

  // Copy
  const [chamada, setChamada] = useState(imovelInicial?.chamada || "");
  const [manifesto, setManifesto] = useState(imovelInicial?.manifesto || "");
  const [conceito, setConceito] = useState(imovelInicial?.conceito || "");
  const [descricao, setDescricao] = useState(imovelInicial?.descricao || "");

  // Localização
  const [bairro, setBairro] = useState(imovelInicial?.bairro || "");
  const [cidade, setCidade] = useState(imovelInicial?.cidade || "Campo Grande");
  const [uf, setUf] = useState(imovelInicial?.uf || "MS");

  // Preço
  const [preco, setPreco] = useState<string>(
    imovelInicial?.preco ? String(imovelInicial.preco) : ""
  );
  const [precoUnidade, setPrecoUnidade] = useState<UnidadePreco>(
    imovelInicial?.preco_unidade || "sob-consulta"
  );

  // Specs
  const [areaUtil, setAreaUtil] = useState<string>(
    imovelInicial?.specs?.areaUtil ? String(imovelInicial.specs.areaUtil) : ""
  );
  const [areaTotal, setAreaTotal] = useState<string>(
    imovelInicial?.specs?.areaTotal ? String(imovelInicial.specs.areaTotal) : ""
  );
  const [quartos, setQuartos] = useState<string>(
    imovelInicial?.specs?.quartos ? String(imovelInicial.specs.quartos) : ""
  );
  const [suites, setSuites] = useState<string>(
    imovelInicial?.specs?.suites ? String(imovelInicial.specs.suites) : ""
  );
  const [vagas, setVagas] = useState<string>(
    imovelInicial?.specs?.vagas ? String(imovelInicial.specs.vagas) : ""
  );
  const [banheiros, setBanheiros] = useState<string>(
    imovelInicial?.specs?.banheiros ? String(imovelInicial.specs.banheiros) : ""
  );

  // Comodidades
  const [comodidades, setComodidades] = useState<string[]>(
    imovelInicial?.comodidades || []
  );
  const [novaComodidade, setNovaComodidade] = useState("");

  // Lançamento
  const [incorporadora, setIncorporadora] = useState(
    imovelInicial?.incorporadora || ""
  );
  const [statusObra, setStatusObra] = useState<StatusObra | "">(
    imovelInicial?.status_obra || "lancamento"
  );
  const [previsaoEntrega, setPrevisaoEntrega] = useState(
    imovelInicial?.previsao_entrega || ""
  );
  const [faseTabela, setFaseTabela] = useState(imovelInicial?.fase_tabela || "");
  const [video, setVideo] = useState(imovelInicial?.video || "");

  // Status
  const [publicado, setPublicado] = useState(
    imovelInicial?.publicado !== undefined ? imovelInicial.publicado : true
  );
  const [destaque, setDestaque] = useState(
    imovelInicial?.destaque !== undefined ? imovelInicial.destaque : false
  );
  const [ordem, setOrdem] = useState<number>(
    typeof imovelInicial?.ordem === "number" ? imovelInicial.ordem : 0
  );

  // Fotos (Cloudflare R2)
  const [fotos, setFotos] = useState<FotoImovel[]>(imovelInicial?.fotos || []);
  const [enviandoFotos, setEnviandoFotos] = useState(false);

  // Estados de envio
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Auto-gerar slug a partir do título no cadastro
  const gerarSlugAutomatico = (nome: string) => {
    return nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleTituloChange = (val: string) => {
    setTitulo(val);
    if (ehNovo && !slug) {
      setSlug(gerarSlugAutomatico(val));
    }
  };

  // Upload direto para Cloudflare R2
  const handleUploadFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = e.target.files;
    if (!arquivos || arquivos.length === 0) return;

    setEnviandoFotos(true);
    setErro(null);

    try {
      const formData = new FormData();
      const slugAtual = slug.trim() || "imovel";
      formData.append("pasta", `${categoria}/${slugAtual}`);

      for (let i = 0; i < arquivos.length; i++) {
        formData.append("files", arquivos[i]);
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Falha no upload para o Cloudflare R2");
      }

      const novasFotos: FotoImovel[] = json.uploads.map(
        (u: { key: string; alt: string }, index: number) => ({
          key: u.key,
          alt: u.alt || titulo || "Foto do imóvel",
          ordem: fotos.length + index,
          is_capa: fotos.length === 0 && index === 0,
        })
      );

      setFotos((prev) => [...prev, ...novasFotos]);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Erro no upload:", error);
      setErro(error.message || "Erro ao enviar mídia para o Cloudflare R2");
    } finally {
      setEnviandoFotos(false);
      e.target.value = "";
    }
  };

  // Definir Capa
  const definirCapa = (index: number) => {
    setFotos((prev) =>
      prev.map((f, i) => ({
        ...f,
        is_capa: i === index,
      }))
    );
  };

  // Remover Foto
  const removerFoto = (index: number) => {
    setFotos((prev) => {
      const novaLista = prev.filter((_, i) => i !== index);
      // Se a removida era capa, define a primeira como capa
      if (novaLista.length > 0 && !novaLista.some((f) => f.is_capa)) {
        novaLista[0].is_capa = true;
      }
      return novaLista;
    });
  };

  // Adicionar comodidade
  const adicionarComodidade = () => {
    if (!novaComodidade.trim()) return;
    if (!comodidades.includes(novaComodidade.trim())) {
      setComodidades([...comodidades, novaComodidade.trim()]);
    }
    setNovaComodidade("");
  };

  const toggleComodidadePadrao = (item: string) => {
    if (comodidades.includes(item)) {
      setComodidades(comodidades.filter((c) => c !== item));
    } else {
      setComodidades([...comodidades, item]);
    }
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    setSucesso(null);

    try {
      const slugLimpo = slug.trim();
      if (!slugLimpo) {
        throw new Error("O slug do imóvel é obrigatório.");
      }

      const supabase = getSupabaseBrowserClient();

      const payloadImovel = {
        titulo: titulo.trim(),
        subtitulo: subtitulo.trim() || null,
        slug: slugLimpo,
        artigo,
        categoria,
        subcategoria,
        chamada: chamada.trim() || null,
        manifesto: manifesto.trim() || null,
        conceito: conceito.trim() || null,
        descricao: descricao.trim() || "",
        bairro: bairro.trim() || "",
        cidade: cidade.trim() || "Campo Grande",
        uf: uf.trim() || "MS",
        preco: preco ? Number(preco) : null,
        preco_unidade: precoUnidade,
        faixa_preco: precoUnidade === "sob-consulta" ? "sob-consulta" : "total",
        specs: {
          areaUtil: areaUtil ? Number(areaUtil) : undefined,
          areaTotal: areaTotal ? Number(areaTotal) : undefined,
          quartos: quartos ? Number(quartos) : undefined,
          suites: suites ? Number(suites) : undefined,
          vagas: vagas ? Number(vagas) : undefined,
          banheiros: banheiros ? Number(banheiros) : undefined,
        },
        comodidades,
        incorporadora: incorporadora.trim() || null,
        status_obra: statusObra || null,
        previsao_entrega: previsaoEntrega.trim() || null,
        fase_tabela: faseTabela.trim() || null,
        video: video.trim() || null,
        publicado,
        destaque,
        ordem: Number(ordem) || 0,
      };

      let imovelId = imovelInicial?.id;

      if (ehNovo) {
        const { data, error: erroInsert } = await supabase
          .from("imoveis")
          .insert(payloadImovel)
          .select("id")
          .single();

        if (erroInsert) throw erroInsert;
        imovelId = data.id;
      } else {
        const { error: erroUpdate } = await supabase
          .from("imoveis")
          .update(payloadImovel)
          .eq("id", imovelId!);

        if (erroUpdate) throw erroUpdate;
      }

      // Sincronizar Fotos no Supabase
      if (imovelId) {
        // Remove fotos antigas do banco e re-insere na ordem correta
        await supabase.from("imovel_fotos").delete().eq("imovel_id", imovelId);

        if (fotos.length > 0) {
          const fotosParaSalvar = fotos.map((f, i) => ({
            imovel_id: imovelId,
            key: f.key,
            alt: f.alt || titulo,
            ordem: i,
            is_capa: Boolean(f.is_capa || i === 0),
          }));

          const { error: erroFotos } = await supabase
            .from("imovel_fotos")
            .insert(fotosParaSalvar);

          if (erroFotos) {
            console.error("Erro ao salvar fotos:", erroFotos);
          }
        }
      }

      // Revalida em tempo real no catálogo
      fetch("/api/revalidate-catalogo", {
        method: "POST",
        body: JSON.stringify({ slug: slugLimpo }),
      }).catch(() => {});

      setSucesso(
        ehNovo
          ? "Imóvel criado e publicado no catálogo com sucesso!"
          : "Alterações salvas com sucesso e sincronizadas em tempo real no catálogo!"
      );

      setTimeout(() => {
        router.push("/admin");
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Erro ao salvar imóvel:", error);
      setErro(error.message || "Erro ao salvar imóvel no Supabase.");
    } finally {
      setSalvando(false);
    }
  };

  const subcategoriasAtuais = getSubcategoriasPorCategoria(categoria);

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Barra de Ações Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-ouro-suave">
        <div>
          <Link
            href="/admin"
            className="text-xs uppercase tracking-wider text-creme-mutado hover:text-ouro-claro transition-colors flex items-center gap-1.5 mb-2"
          >
            ← Voltar para listagem
          </Link>
          <h1 className="text-2xl font-serif text-ouro-claro font-semibold uppercase">
            {ehNovo ? "Cadastrar Novo Imóvel" : `Editar: ${titulo || "Imóvel"}`}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {!ehNovo && slug && (
            <a
              href={`http://localhost:3000/imovel/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl btn-secundario text-xs uppercase tracking-wider font-medium"
            >
              Visualizar no Catálogo ↗
            </a>
          )}
          <button
            type="submit"
            disabled={salvando}
            className="px-6 py-2.5 rounded-xl btn-ouro text-xs uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar Imóvel"}
          </button>
        </div>
      </div>

      {erro && (
        <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          {sucesso}
        </div>
      )}

      {/* Barra de Navegação Rápida entre Seções (Sticky) */}
      <div className="sticky top-3 z-30 bg-espresso/95 backdrop-blur-md border border-ouro-suave/80 rounded-2xl p-2 shadow-2xl flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <a
          href="#secao-categoria"
          className="px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider font-semibold text-ouro-claro bg-ouro/15 border border-ouro/30 shrink-0 hover:bg-ouro/25 transition-colors"
        >
          1. Categoria & Tipo
        </a>
        {categoria === "lancamentos" && (
          <a
            href="#secao-empreendimento"
            className="px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 shrink-0 hover:bg-emerald-900/60 transition-colors"
          >
            🏗️ 2. Empreendimento & Obra
          </a>
        )}
        <a
          href="#secao-textos"
          className="px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider font-medium text-creme/70 hover:text-ouro-claro hover:bg-cafe transition-colors shrink-0"
        >
          {categoria === "lancamentos" ? "3" : "2"}. Textos & Copy
        </a>
        <a
          href="#secao-localizacao"
          className="px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider font-medium text-creme/70 hover:text-ouro-claro hover:bg-cafe transition-colors shrink-0"
        >
          {categoria === "lancamentos" ? "4" : "3"}. Localização
        </a>
        <a
          href="#secao-valores"
          className="px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider font-medium text-creme/70 hover:text-ouro-claro hover:bg-cafe transition-colors shrink-0"
        >
          {categoria === "lancamentos" ? "5" : "4"}. Preço
        </a>
        <a
          href="#secao-specs"
          className="px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider font-medium text-creme/70 hover:text-ouro-claro hover:bg-cafe transition-colors shrink-0"
        >
          {categoria === "lancamentos" ? "6" : "5"}. Specs & Lazer
        </a>
        <a
          href="#secao-fotos"
          className="px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider font-medium text-creme/70 hover:text-ouro-claro hover:bg-cafe transition-colors shrink-0"
        >
          {categoria === "lancamentos" ? "7" : "6"}. Fotos R2
        </a>
        <a
          href="#secao-publicacao"
          className="px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider font-medium text-creme/70 hover:text-ouro-claro hover:bg-cafe transition-colors shrink-0"
        >
          {categoria === "lancamentos" ? "8" : "7"}. Vitrine & Ordem
        </a>
      </div>

      {/* SEÇÃO 1: Categoria & Tipo de Imóvel */}
      <div id="secao-categoria" className="scroll-mt-24 bg-cafe border border-ouro-suave p-6 sm:p-8 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ouro-suave/60 pb-4">
          <div>
            <h2 className="text-base font-serif text-ouro font-semibold uppercase tracking-wider">
              1. Categoria & Tipo de Imóvel
            </h2>
            <p className="text-xs text-creme-mutado mt-0.5">
              Selecione se é um novo empreendimento/lançamento ou imóvel de revenda/agro.
            </p>
          </div>
          <span className="text-[0.6875rem] font-mono text-ouro-claro uppercase px-3 py-1 rounded-full bg-espresso border border-ouro/30">
            {categoria} · {subcategoria}
          </span>
        </div>

        {/* 4 Cards Visuais de Categoria */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-3">
            Categoria Principal *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CATEGORIAS_CONFIG.map((cat) => {
              const selecionada = categoria === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => {
                    const novaCat = cat.slug;
                    setCategoria(novaCat);
                    const subs = getSubcategoriasPorCategoria(novaCat);
                    if (subs.length > 0) setSubcategoria(subs[0].slug);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    selecionada
                      ? "bg-espresso border-ouro ring-2 ring-ouro/40 text-ouro-claro shadow-lg"
                      : "bg-cafe-leve border-ouro-suave/60 text-creme/70 hover:border-ouro/50 hover:bg-espresso/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">
                      {cat.slug === "lancamentos" && "🏗️"}
                      {cat.slug === "revendas" && "🔑"}
                      {cat.slug === "investimentos" && "💼"}
                      {cat.slug === "fazendas" && "🌾"}
                    </span>
                    {selecionada && (
                      <span className="text-[0.5625rem] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-ouro text-espresso">
                        Ativa
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="block font-serif text-sm font-semibold text-creme">
                      {cat.titulo}
                    </span>
                    <span className="block text-[0.6875rem] text-creme-mutado mt-1 line-clamp-2">
                      {cat.slug === "lancamentos" && "Lançamentos e empreendimentos na planta / em obras"}
                      {cat.slug === "revendas" && "Casas, apartamentos prontos e lotes avulsos"}
                      {cat.slug === "investimentos" && "Salas corporativas, galpões e renda de locação"}
                      {cat.slug === "fazendas" && "Fazendas de pecuária, lavoura e áreas rurais"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subcategorias em Chips Clicáveis */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-3">
            Subcategoria de {categoria === "lancamentos" ? "Empreendimento" : "Imóvel"} *
          </label>
          <div className="flex flex-wrap gap-2">
            {subcategoriasAtuais.map((sub) => {
              const selecionada = subcategoria === sub.slug;
              return (
                <button
                  key={sub.slug}
                  type="button"
                  onClick={() => setSubcategoria(sub.slug)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
                    selecionada
                      ? "bg-ouro text-espresso font-semibold shadow-md"
                      : "bg-espresso/90 border border-ouro-suave/70 text-creme/80 hover:border-ouro hover:text-ouro-claro"
                  }`}
                >
                  <span>{selecionada ? "✓" : "•"}</span>
                  {sub.titulo}
                </button>
              );
            })}
          </div>
        </div>

        {/* Título, Artigo, Subtítulo e Slug */}
        <div className="pt-4 border-t border-ouro-suave/60 grid grid-cols-1 sm:grid-cols-12 gap-5">
          <div className="sm:col-span-8">
            <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
              Título do Imóvel / Empreendimento *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => handleTituloChange(e.target.value)}
              placeholder="Ex: Plaenge Design by Pininfarina"
              required
              className="w-full input-luxury text-sm font-medium"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
              Artigo de Gênero
            </label>
            <select
              value={artigo}
              onChange={(e) => setArtigo(e.target.value as "o" | "a")}
              className="w-full input-luxury text-sm"
            >
              <option value="o">"o" (ex: o Plaenge, o Sobrado)</option>
              <option value="a">"a" (ex: a Fazenda, a Casa)</option>
            </select>
          </div>

          <div className="sm:col-span-12">
            <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
              Subtítulo / Resumo da Capa
            </label>
            <input
              type="text"
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              placeholder="Ex: Royal Park · 287 a 348m² · 4 suítes"
              className="w-full input-luxury text-sm"
            />
          </div>

          <div className="sm:col-span-12">
            <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
              Slug da URL (identificador único permanente) *
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ex: plaenge-design-by-pininfarina"
              required
              className="w-full input-luxury text-xs font-mono text-ouro-claro"
            />
            <p className="text-[0.6875rem] text-creme/40 mt-1">
              Endereço no catálogo público: /imovel/{slug || "slug-do-imovel"}
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: Dados do Empreendimento & Obra (Destaque para Lançamentos) */}
      {categoria === "lancamentos" && (
        <div
          id="secao-empreendimento"
          className="scroll-mt-24 bg-cafe border border-ouro/40 p-6 sm:p-8 rounded-2xl space-y-6 shadow-xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ouro-suave/60 pb-4">
            <div>
              <h2 className="text-base font-serif text-ouro font-semibold uppercase tracking-wider flex items-center gap-2">
                <span>🏗️</span> 2. Dados do Empreendimento & Construtora
              </h2>
              <p className="text-xs text-creme-mutado mt-0.5">
                Configurações comerciais de lançamentos na planta e em obras.
              </p>
            </div>
            <span className="text-[0.6875rem] uppercase font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-3 py-1 rounded-full">
              Exclusivo de Lançamentos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
            <div className="sm:col-span-12">
              <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
                Incorporadora / Construtora
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {["Plaenge", "HVM", "Vanguard", "JOOY", "Aykos", "Bonsai"].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setIncorporadora(inc)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      incorporadora === inc
                        ? "bg-ouro text-espresso font-bold"
                        : "bg-espresso border border-ouro-suave/60 text-creme/70 hover:border-ouro hover:text-ouro-claro"
                    }`}
                  >
                    {inc}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={incorporadora}
                onChange={(e) => setIncorporadora(e.target.value)}
                placeholder="Ou digite outra incorporadora..."
                className="w-full input-luxury text-sm"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
                Fase / Status da Obra
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OBRA_CONFIG.map((s) => {
                  const ativo = statusObra === s.valor;
                  return (
                    <button
                      key={s.valor}
                      type="button"
                      onClick={() => setStatusObra(s.valor as StatusObra)}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer ${
                        ativo
                          ? "bg-ouro text-espresso font-bold border-ouro shadow"
                          : "bg-espresso border-ouro-suave/60 text-creme/70 hover:border-ouro/50"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sm:col-span-6 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
                  Previsão de Entrega
                </label>
                <input
                  type="text"
                  value={previsaoEntrega}
                  onChange={(e) => setPrevisaoEntrega(e.target.value)}
                  placeholder="Ex: Dezembro de 2028 ou Pronto para Morar"
                  className="w-full input-luxury text-sm"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
                  Fase de Tabela Comercial
                </label>
                <input
                  type="text"
                  value={faseTabela}
                  onChange={(e) => setFaseTabela(e.target.value)}
                  placeholder="Ex: Tabela Zero de Lançamento"
                  className="w-full input-luxury text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: Copy Editorial */}
      <div
        id="secao-textos"
        className="scroll-mt-24 bg-cafe border border-ouro-suave p-6 sm:p-8 rounded-2xl space-y-6"
      >
        <h2 className="text-base font-serif text-ouro font-semibold uppercase tracking-wider">
          {categoria === "lancamentos" ? "3" : "2"}. Textos e Copy Comercial
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
              Chamada de Destaque (Headline)
            </label>
            <input
              type="text"
              value={chamada}
              onChange={(e) => setChamada(e.target.value)}
              placeholder="Ex: Engenharia Plaenge com assinatura Pininfarina, de frente para o Parque"
              className="w-full input-luxury text-sm"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
              Manifesto / Texto-Âncora (aparece na ficha e vira descrição de SEO)
            </label>
            <textarea
              rows={2}
              value={manifesto}
              onChange={(e) => setManifesto(e.target.value)}
              placeholder="Ex: A vista para o Parque das Nações Indígenas é definitiva e permanente."
              className="w-full input-luxury text-sm"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
              Descrição Completa da Cirlene
            </label>
            <textarea
              rows={5}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o imóvel com a voz e autoridade da Cirlene..."
              className="w-full input-luxury text-sm"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO: Localização */}
      <div
        id="secao-localizacao"
        className="scroll-mt-24 bg-cafe border border-ouro-suave p-6 sm:p-8 rounded-2xl space-y-6"
      >
        <h2 className="text-base font-serif text-ouro font-semibold uppercase tracking-wider">
          {categoria === "lancamentos" ? "4" : "3"}. Localização
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
          <div className="sm:col-span-6">
            <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
              Bairro
            </label>
            <input
              type="text"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              placeholder="Ex: Chácara Cachoeira, Royal Park, Centro"
              className="w-full input-luxury text-sm"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
              Cidade
            </label>
            <input
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Campo Grande"
              className="w-full input-luxury text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
              UF
            </label>
            <input
              type="text"
              value={uf}
              onChange={(e) => setUf(e.target.value.toUpperCase())}
              placeholder="MS"
              maxLength={2}
              className="w-full input-luxury text-sm uppercase text-center"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO: Valores & Preço */}
      <div
        id="secao-valores"
        className="scroll-mt-24 bg-cafe border border-ouro-suave p-6 sm:p-8 rounded-2xl space-y-6"
      >
        <h2 className="text-base font-serif text-ouro font-semibold uppercase tracking-wider">
          {categoria === "lancamentos" ? "5" : "4"}. Preço e Valores
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
          <div className="sm:col-span-6">
            <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
              Valor / Preço (R$)
            </label>
            <input
              type="number"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              placeholder="Ex: 3500000"
              className="w-full input-luxury text-sm font-medium"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
              Unidade de Precificação
            </label>
            <select
              value={precoUnidade}
              onChange={(e) => setPrecoUnidade(e.target.value as UnidadePreco)}
              className="w-full input-luxury text-sm"
            >
              {UNIDADES_PRECO_CONFIG.map((u) => (
                <option key={u.valor} value={u.valor}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SEÇÃO: Especificações & Comodidades */}
      <div
        id="secao-specs"
        className="scroll-mt-24 bg-cafe border border-ouro-suave p-6 sm:p-8 rounded-2xl space-y-6"
      >
        <h2 className="text-base font-serif text-ouro font-semibold uppercase tracking-wider">
          {categoria === "lancamentos" ? "6" : "5"}. Especificações & Comodidades
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
          <div>
            <label className="block text-[0.625rem] uppercase tracking-wider text-creme-mutado mb-2">
              Área Útil (m²)
            </label>
            <input
              type="number"
              value={areaUtil}
              onChange={(e) => setAreaUtil(e.target.value)}
              placeholder="Ex: 180"
              className="w-full input-luxury text-sm text-center"
            />
          </div>

          <div>
            <label className="block text-[0.625rem] uppercase tracking-wider text-creme-mutado mb-2">
              Área Total (m²)
            </label>
            <input
              type="number"
              value={areaTotal}
              onChange={(e) => setAreaTotal(e.target.value)}
              placeholder="Ex: 240"
              className="w-full input-luxury text-sm text-center"
            />
          </div>

          <div>
            <label className="block text-[0.625rem] uppercase tracking-wider text-creme-mutado mb-2">
              Quartos
            </label>
            <input
              type="number"
              value={quartos}
              onChange={(e) => setQuartos(e.target.value)}
              placeholder="3"
              className="w-full input-luxury text-sm text-center"
            />
          </div>

          <div>
            <label className="block text-[0.625rem] uppercase tracking-wider text-creme-mutado mb-2">
              Suítes
            </label>
            <input
              type="number"
              value={suites}
              onChange={(e) => setSuites(e.target.value)}
              placeholder="3"
              className="w-full input-luxury text-sm text-center"
            />
          </div>

          <div>
            <label className="block text-[0.625rem] uppercase tracking-wider text-creme-mutado mb-2">
              Vagas Garagem
            </label>
            <input
              type="number"
              value={vagas}
              onChange={(e) => setVagas(e.target.value)}
              placeholder="2"
              className="w-full input-luxury text-sm text-center"
            />
          </div>

          <div>
            <label className="block text-[0.625rem] uppercase tracking-wider text-creme-mutado mb-2">
              Banheiros
            </label>
            <input
              type="number"
              value={banheiros}
              onChange={(e) => setBanheiros(e.target.value)}
              placeholder="4"
              className="w-full input-luxury text-sm text-center"
            />
          </div>
        </div>

        {/* Comodidades e Diferenciais */}
        <div className="pt-4 border-t border-ouro-suave">
          <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-3">
            Diferenciais & Comodidades
          </label>

          <div className="flex flex-wrap gap-2 mb-4">
            {COMODIDADES_PADRAO.map((item) => {
              const selecionado = comodidades.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleComodidadePadrao(item)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                    selecionado
                      ? "bg-ouro text-espresso font-semibold"
                      : "bg-cafe-leve text-creme/70 border border-ouro-suave hover:border-ouro"
                  }`}
                >
                  {selecionado ? "✓ " : "+ "}
                  {item}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={novaComodidade}
              onChange={(e) => setNovaComodidade(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionarComodidade();
                }
              }}
              placeholder="Adicionar outro diferencial..."
              className="flex-1 input-luxury text-xs"
            />
            <button
              type="button"
              onClick={adicionarComodidade}
              className="px-4 py-2 rounded-lg btn-secundario text-xs uppercase"
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>


      {/* SEÇÃO: Galeria de Fotos & Mídia (Cloudflare R2) */}
      <div
        id="secao-fotos"
        className="scroll-mt-24 bg-cafe border border-ouro-suave p-6 sm:p-8 rounded-2xl space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-serif text-ouro font-semibold uppercase tracking-wider">
              {categoria === "lancamentos" ? "7" : "6"}. Fotos e Vídeos (Cloudflare R2)
            </h2>
            <p className="text-xs text-creme-mutado mt-1">
              As imagens e vídeos são gravados diretamente no bucket R2 e vinculados ao imóvel.
            </p>
          </div>

          {/* Botão de Upload */}
          <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-ouro text-xs uppercase tracking-wider cursor-pointer font-semibold shrink-0">
            {enviandoFotos ? "Enviando para o R2..." : "📷 Adicionar Fotos (R2)"}
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleUploadFotos}
              disabled={enviandoFotos}
              className="hidden"
            />
          </label>
        </div>

        {/* Campo de Vídeo */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
            Chave ou Link do Vídeo (R2 ou YouTube/Vimeo)
          </label>
          <input
            type="text"
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            placeholder="Ex: lancamentos/pininfarina/video-apresentacao.mp4"
            className="w-full input-luxury text-xs font-mono"
          />
        </div>

        {/* Galeria de Fotos Adicionadas */}
        {fotos.length === 0 ? (
          <div className="py-12 border border-dashed border-ouro-suave rounded-xl text-center text-xs text-creme/50">
            Nenhuma foto vinculada ainda. Clique no botão acima para selecionar e enviar fotos para o Cloudflare R2.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {fotos.map((f, index) => {
              const url = getUrlPublicaR2(f.key, 480);
              return (
                <div
                  key={`${f.key}-${index}`}
                  className={`bg-espresso border rounded-xl overflow-hidden relative group transition-all ${
                    f.is_capa
                      ? "border-ouro ring-2 ring-ouro/40"
                      : "border-ouro-suave"
                  }`}
                >
                  <div className="h-32 w-full bg-cafe relative">
                    <img
                      src={url}
                      alt={f.alt || "Foto"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&auto=format&fit=crop&q=80";
                      }}
                    />

                    {f.is_capa && (
                      <span className="absolute top-2 left-2 bg-ouro text-espresso text-[0.625rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                        Capa Principal
                      </span>
                    )}

                    {/* Botão de excluir foto */}
                    <button
                      type="button"
                      onClick={() => removerFoto(index)}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
                      title="Remover foto"
                    >
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-2.5 space-y-2">
                    <input
                      type="text"
                      value={f.alt}
                      onChange={(e) => {
                        const novoAlt = e.target.value;
                        setFotos((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, alt: novoAlt } : item
                          )
                        );
                      }}
                      placeholder="Descrição da foto (Alt)"
                      className="w-full bg-cafe border border-ouro-suave text-creme text-[0.6875rem] px-2 py-1 rounded outline-none"
                    />

                    {!f.is_capa && (
                      <button
                        type="button"
                        onClick={() => definirCapa(index)}
                        className="w-full py-1 text-[0.625rem] uppercase tracking-wider border border-ouro-suave rounded hover:bg-ouro/20 text-ouro-claro transition-colors cursor-pointer"
                      >
                        Definir como Capa
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEÇÃO: Visibilidade & Status */}
      <div
        id="secao-publicacao"
        className="scroll-mt-24 bg-cafe border border-ouro-suave p-6 sm:p-8 rounded-2xl space-y-6"
      >
        <h2 className="text-base font-serif text-ouro font-semibold uppercase tracking-wider">
          {categoria === "lancamentos" ? "8" : "7"}. Visibilidade & Publicação
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Toggle Publicado no Catálogo */}
          <div className="p-4 rounded-xl bg-cafe-leve border border-ouro-suave flex items-center justify-between">
            <div>
              <span className="block text-xs uppercase font-semibold text-creme">
                Publicado no Catálogo
              </span>
              <span className="block text-[0.625rem] text-creme-mutado mt-0.5">
                {publicado
                  ? "Ativo e visível para os clientes"
                  : "Oculto/Desativado (mantido no painel)"}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={publicado}
                onChange={(e) => setPublicado(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          {/* Toggle Destaque */}
          <div className="p-4 rounded-xl bg-cafe-leve border border-ouro-suave flex items-center justify-between">
            <div>
              <span className="block text-xs uppercase font-semibold text-creme">
                Destaque na Home
              </span>
              <span className="block text-[0.625rem] text-creme-mutado mt-0.5">
                Exibir na vitrine principal
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={destaque}
                onChange={(e) => setDestaque(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ouro" />
            </label>
          </div>

          {/* Ordem */}
          <div className="p-4 rounded-xl bg-cafe-leve border border-ouro-suave flex items-center justify-between">
            <div>
              <span className="block text-xs uppercase font-semibold text-creme">
                Ordem de Exibição
              </span>
              <span className="block text-[0.625rem] text-creme-mutado mt-0.5">
                Menor número aparece primeiro
              </span>
            </div>
            <input
              type="number"
              value={ordem}
              onChange={(e) => setOrdem(Number(e.target.value))}
              className="w-20 input-luxury text-sm text-center"
            />
          </div>
        </div>
      </div>

      {/* Botões de Ação Inferiores */}
      <div className="flex justify-end gap-3 pt-4">
        <Link
          href="/admin"
          className="px-6 py-3 rounded-xl btn-secundario text-xs uppercase tracking-wider"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={salvando}
          className="px-8 py-3 rounded-xl btn-ouro text-xs uppercase tracking-widest font-semibold cursor-pointer disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar e Sincronizar Catálogo"}
        </button>
      </div>
    </form>
  );
}
