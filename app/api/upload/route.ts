import { NextRequest, NextResponse } from "next/server";
import { uploadParaR2 } from "@/lib/r2";
import { exigirLogin } from "@/lib/exigir-login";

export const dynamic = "force-dynamic";

// Abaixo do teto de 4,5 MB da Vercel, com folga para o envelope do formulário.
const TETO_BYTES = 4.4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  // Fora do matcher do middleware: sem isto, qualquer um subia arquivo no R2.
  const bloqueio = await exigirLogin();
  if (bloqueio) return bloqueio;

  try {
    const formData = await req.formData();
    const pasta = String(formData.get("pasta") || "geral").replace(/[^a-z0-9/-]/gi, "-").replace(/^\/+/, "");
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado para upload." }, { status: 400 });
    }

    const uploads = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: `${file.name}: só imagens por aqui.` }, { status: 415 });
      }
      if (file.size > TETO_BYTES) {
        return NextResponse.json({ error: `${file.name}: acima de 4,4 MB.` }, { status: 413 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const nomeLimpo = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const chave = `${pasta}/${Date.now()}-${nomeLimpo}`;
      const resultado = await uploadParaR2(chave, buffer, file.type);
      uploads.push({ key: resultado.key, url: resultado.url });
    }

    return NextResponse.json({ success: true, uploads });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Erro na API de upload R2:", err);
    return NextResponse.json(
      { error: err.message || "Falha ao enviar arquivo para o Cloudflare R2" },
      { status: 500 }
    );
  }
}
