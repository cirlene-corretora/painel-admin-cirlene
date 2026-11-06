// Envio de mídia a partir do navegador.
//
// Foto: a Vercel recusa corpo acima de 4,5 MB, e foto de celular passa disso.
// Reduz no navegador (JPEG, porque o Safari não gera WebP em canvas) e manda
// UMA por requisição. A foto enviada pelo painel é servida como está, sem
// derivados, então o tamanho aqui é o que o visitante baixa.
//
// Vídeo: não cabe na Vercel. Sobe direto no R2 por URL assinada.

const LADO_MAXIMO = 1920;
const TETO_BYTES = 4 * 1024 * 1024;

async function reduzir(arquivo: File, qualidade: number): Promise<File> {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let q = qualidade;
  let blob: Blob | null = null;
  do {
    blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", q));
    q -= 0.12;
  } while (blob && blob.size > TETO_BYTES && q > 0.4);
  if (!blob) throw new Error("não foi possível converter a imagem");

  const nome = arquivo.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], nome, { type: "image/jpeg" });
}

/** Sobe uma imagem e devolve a chave no R2. */
export async function enviarImagem(arquivo: File, pasta: string, tipo: "foto" | "planta"): Promise<string> {
  if (!arquivo.type.startsWith("image/")) throw new Error("não é uma imagem");

  let pronto: File;
  try {
    // Planta tem texto miúdo: qualidade maior.
    pronto = await reduzir(arquivo, tipo === "planta" ? 0.9 : 0.84);
  } catch {
    throw new Error("formato não suportado neste navegador (use JPG ou PNG)");
  }

  const dados = new FormData();
  dados.append("pasta", pasta);
  dados.append("files", pronto);
  const res = await fetch("/api/upload", { method: "POST", body: dados });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `o servidor respondeu ${res.status}`);
  return json.uploads[0].key as string;
}

/** Sobe um .mp4 direto no R2 e devolve o valor para gravar no imóvel (`r2:…`). */
export async function enviarVideo(
  arquivo: File,
  pasta: string,
  aoProgredir: (percentual: number) => void,
): Promise<string> {
  const res = await fetch("/api/upload-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pasta, nome: arquivo.name, tipo: arquivo.type, tamanho: arquivo.size }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `o servidor respondeu ${res.status}`);

  await new Promise<void>((ok, falha) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", json.url);
    xhr.setRequestHeader("Content-Type", "video/mp4");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) aoProgredir(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status < 300 ? ok() : falha(new Error(`o R2 respondeu ${xhr.status}`)));
    xhr.onerror = () => falha(new Error("a conexão com o R2 falhou"));
    xhr.send(arquivo);
  });
  return `r2:${json.chave}`;
}
