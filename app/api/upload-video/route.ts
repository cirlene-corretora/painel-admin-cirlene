import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "@/lib/r2";
import { exigirLogin } from "@/lib/exigir-login";

export const dynamic = "force-dynamic";

const TETO_BYTES = 300 * 1024 * 1024;

// O vídeo não passa pela Vercel (teto de 4,5 MB): o navegador sobe direto no
// R2 com esta URL assinada, válida por 15 minutos e só para esta chave.
// O bucket precisa de CORS liberando PUT da origem do painel.
export async function POST(req: NextRequest) {
  const bloqueio = await exigirLogin();
  if (bloqueio) return bloqueio;

  const corpo = (await req.json().catch(() => ({}))) as {
    pasta?: string;
    nome?: string;
    tipo?: string;
    tamanho?: number;
  };
  if (corpo.tipo !== "video/mp4") {
    return NextResponse.json({ error: "Use um vídeo .mp4: é o formato que toca em todo celular." }, { status: 415 });
  }
  if (!corpo.tamanho || corpo.tamanho > TETO_BYTES) {
    return NextResponse.json({ error: "Vídeo acima de 300 MB. Comprima antes de enviar." }, { status: 413 });
  }

  const pasta = String(corpo.pasta || "geral").replace(/[^a-z0-9/-]/gi, "-").replace(/^\/+/, "");
  const nome = String(corpo.nome || "video.mp4").toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
  const chave = `${pasta}/video/${Date.now()}-${nome}`;

  try {
    const url = await getSignedUrl(
      getR2Client(),
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET || "cirlene-catalogo",
        Key: chave,
        ContentType: "video/mp4",
      }),
      { expiresIn: 900 },
    );
    return NextResponse.json({ url, chave });
  } catch (error: unknown) {
    console.error("Erro ao assinar envio de vídeo:", error);
    return NextResponse.json({ error: "Não foi possível preparar o envio do vídeo." }, { status: 500 });
  }
}
