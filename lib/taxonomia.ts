import type { CategoriaInfo, SlugCategoria } from "./types";

export const CATEGORIAS_CONFIG: CategoriaInfo[] = [
  {
    slug: "lancamentos",
    titulo: "Lançamentos",
    subcategorias: [
      { slug: "apartamentos", titulo: "Apartamentos" },
      { slug: "studios", titulo: "Studios" },
      { slug: "apartamentos-mcmv", titulo: "Apartamentos Minha Casa, Minha Vida" },
      { slug: "condominio-de-casas", titulo: "Condomínio de casas" },
      { slug: "condominios-urbanos", titulo: "Condomínios urbanos" },
      { slug: "condominios-rurais", titulo: "Condomínios rurais" },
      { slug: "consultorios", titulo: "Consultórios de saúde" },
    ],
  },
  {
    slug: "revendas",
    titulo: "Revendas",
    subcategorias: [
      { slug: "casas", titulo: "Casas" },
      { slug: "casas-em-condominio", titulo: "Casas em Condomínio" },
      { slug: "apartamentos", titulo: "Apartamentos" },
      { slug: "terrenos", titulo: "Terrenos e Lotes" },
    ],
  },
  {
    slug: "investimentos",
    titulo: "Investimentos / Business",
    subcategorias: [
      { slug: "salas-corporativas", titulo: "Salas Corporativas" },
      { slug: "br-log", titulo: "Galpões & Logística (BR LOG)" },
      { slug: "renda-de-aluguel", titulo: "Renda de Aluguel" },
    ],
  },
  {
    slug: "fazendas",
    titulo: "Fazendas & Agronegócio",
    subcategorias: [
      { slug: "pecuaria", titulo: "Fazendas de Pecuária" },
      { slug: "lavoura", titulo: "Fazendas de Lavoura / Grãos" },
      { slug: "mistas", titulo: "Fazendas Mistas" },
    ],
  },
];

export const STATUS_OBRA_CONFIG = [
  { valor: "breve-lancamento", label: "Breve Lançamento" },
  { valor: "lancamento", label: "Lançamento" },
  { valor: "em-obras", label: "Em Obras" },
  { valor: "pronto", label: "Pronto para Morar" },
];

export const UNIDADES_PRECO_CONFIG = [
  { valor: "total", label: "Preço Total (R$)" },
  { valor: "a-partir-de", label: "A partir de (R$)" },
  { valor: "por-m2", label: "Por m² (R$)" },
  { valor: "sob-consulta", label: "Sob Consulta" },
];

export const COMODIDADES_PADRAO = [
  "Piscina com raia aquecida",
  "Piscina privativa",
  "Espaço Gourmet",
  "Academia de ponta",
  "Portaria blindada 24h",
  "Hall privativo",
  "Churrasqueira",
  "Varanda gourmet",
  "Elevador privativo",
  "Área verde / Paisagismo",
  "Brinquedoteca",
  "Quadra de tênis / Beach tennis",
  "Spa e sauna",
  "Coworking",
  "Pet place",
  "Garagem subterrânea",
  "Automação residencial",
  "Vista panorâmica definitiva",
];

export function getSubcategoriasPorCategoria(cat: SlugCategoria) {
  const achado = CATEGORIAS_CONFIG.find((c) => c.slug === cat);
  return achado ? achado.subcategorias : [];
}

export function formatarPreco(
  preco?: number | null,
  unidade: string = "total"
): string {
  if (unidade === "sob-consulta" || preco == null || preco <= 0) {
    return "Sob consulta";
  }

  const formatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(preco);

  if (unidade === "a-partir-de") return `A partir de ${formatado}`;
  if (unidade === "por-m2") return `${formatado} / m²`;
  return formatado;
}
