export type UnidadePreco = "total" | "por-m2" | "a-partir-de" | "sob-consulta";

export type StatusObra = "breve-lancamento" | "lancamento" | "em-obras" | "pronto";

export type SlugCategoria =
  | "lancamentos"
  | "revendas"
  | "business"
  | "investimentos"
  | "fazendas";

/** Faixa de lançamento: contagem = maior + `…Min`; área = menor + `…Max` (igual ao catálogo). */
export interface Specs {
  quartos?: number;
  quartosMin?: number;
  suites?: number;
  suitesMin?: number;
  vagas?: number;
  vagasMin?: number;
  banheiros?: number;
  areaUtil?: number; // m²
  areaUtilMax?: number; // m²
  areaTotal?: number; // m²
  areaTotalMax?: number; // m²
}

export interface FotoImovel {
  id?: string;
  imovel_id?: string;
  key: string;
  alt: string;
  ordem: number;
  is_capa: boolean;
  lqip?: string | null;
  criado_em?: string;
}

export interface ImovelCompleto {
  id: string;
  slug: string;
  legacy_id?: string | null;
  categoria: SlugCategoria;
  subcategoria: string;
  titulo: string;
  artigo: "o" | "a";
  subtitulo?: string | null;
  chamada?: string | null;
  manifesto?: string | null;
  conceito?: string | null;
  descricao: string;
  bairro: string;
  cidade: string;
  uf: string;
  preco?: number | null;
  preco_unidade: UnidadePreco;
  faixa_preco: string;
  specs: Specs;
  comodidades: string[];
  incorporadora?: string | null;
  status_obra?: StatusObra | null;
  previsao_entrega?: string | null;
  fase_tabela?: string | null;
  video?: string | null;
  destaque: boolean;
  publicado: boolean;
  ordem: number;
  criado_em?: string;
  atualizado_em?: string;
  fotos?: FotoImovel[];
}

export interface SubcategoriaInfo {
  slug: string;
  titulo: string;
}

export interface CategoriaInfo {
  slug: SlugCategoria;
  titulo: string;
  subcategorias: SubcategoriaInfo[];
}
