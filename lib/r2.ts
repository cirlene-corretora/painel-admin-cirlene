import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID!;
const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
const bucket = process.env.R2_BUCKET || "cirlene-catalogo";
const publicUrl = process.env.NEXT_PUBLIC_R2_URL || "https://pub-6661c438786c49eeb6870051aeff5da8.r2.dev";

export function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Faz upload de um arquivo para o Cloudflare R2
 * @param chave Caminho relativo do arquivo no bucket (ex: "lancamentos/meu-imovel/foto-1.webp")
 * @param buffer Conteúdo binário do arquivo
 * @param contentType Tipo MIME (ex: "image/webp", "image/jpeg", "video/mp4")
 */
export async function uploadParaR2(
  chave: string,
  buffer: Buffer,
  contentType: string
): Promise<{ key: string; url: string }> {
  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: chave,
    Body: buffer,
    ContentType: contentType,
  });

  await client.send(command);

  return {
    key: chave,
    url: `${publicUrl}/${chave}`,
  };
}

/**
 * Deleta um arquivo do Cloudflare R2
 */
export async function deletarDoR2(chave: string): Promise<boolean> {
  const client = getR2Client();

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: chave,
    });
    await client.send(command);
    return true;
  } catch (error) {
    console.error(`Erro ao deletar ${chave} do R2:`, error);
    return false;
  }
}

/**
 * Retorna a URL pública completa para uma chave do R2
 */
export function getUrlPublicaR2(chave: string): string {
  if (!chave) return "";
  if (chave.startsWith("http://") || chave.startsWith("https://")) {
    return chave;
  }
  return `${publicUrl}/${chave.replace(/^\//, "")}`;
}
