// Só o que o navegador pode usar. Nada de SDK nem credencial aqui: o formulário
// importava isto de lib/r2.ts e levava o cliente S3 inteiro para o bundle.

const R2_PUBLICO =
  process.env.NEXT_PUBLIC_R2_URL || "https://pub-6661c438786c49eeb6870051aeff5da8.r2.dev";

/** Endereço do catálogo no ar. `||`, não `??`: env vazia na Vercel chega como "". */
export const CATALOGO_URL =
  process.env.NEXT_PUBLIC_CATALOGO_URL || "https://www.cirlenerobalinhoimoveis.com.br";

export function linkCatalogo(caminho = ""): string {
  return `${CATALOGO_URL.replace(/\/$/, "")}${caminho}`;
}

/** URL pública de uma foto. Chave sem extensão = derivados do acervo; com extensão = enviada pelo painel. */
export function getUrlPublicaR2(chave: string, tamanho: 480 | 768 | 1080 = 480): string {
  if (!chave) return "";
  if (/^https?:\/\//.test(chave)) return chave;
  const limpa = chave.replace(/^\//, "");
  if (/\.(jpe?g|png|webp|avif|gif)$/i.test(limpa)) return `${R2_PUBLICO}/${limpa}`;
  return `${R2_PUBLICO}/${limpa}/${tamanho}.webp`;
}

/** URL tocável do vídeo salvo no imóvel (mesma regra de lib/media.ts do catálogo). */
export function urlVideo(valor: string): string {
  if (valor.startsWith("r2:")) return `${R2_PUBLICO}/${valor.slice(3)}`;
  return valor;
}

/**
 * Aceita o que o player do catálogo toca: chave `r2:` ou link direto de .mp4.
 * Caminho solto vira `r2:`. YouTube e Vimeo não tocam num <video>: erro claro.
 */
export function normalizarVideo(valor: string): string | null {
  const v = valor.trim();
  if (!v) return null;
  if (/youtu\.?be|vimeo/i.test(v)) {
    throw new Error("Vídeo: YouTube e Vimeo não tocam no catálogo. Envie o arquivo .mp4 pelo botão de vídeo.");
  }
  if (v.startsWith("r2:")) return v;
  if (/^https?:\/\/.+\.mp4(\?.*)?$/i.test(v)) return v;
  if (/^[\w./-]+\.mp4$/i.test(v)) return `r2:${v.replace(/^\//, "")}`;
  throw new Error("Vídeo: use o botão de envio, ou informe um link direto terminado em .mp4.");
}
