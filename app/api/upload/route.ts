import { NextRequest, NextResponse } from "next/server";
import { uploadParaR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const pasta = (formData.get("pasta") as string) || "geral";
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado para upload." },
        { status: 400 }
      );
    }

    const uploads = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const nomeLimpo = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const timestamp = Date.now();
      const chave = `${pasta}/${timestamp}-${nomeLimpo}`;

      const resultado = await uploadParaR2(
        chave,
        buffer,
        file.type || "application/octet-stream"
      );

      uploads.push({
        key: resultado.key,
        url: resultado.url,
        alt: file.name.replace(/\.[^/.]+$/, ""),
      });
    }

    return NextResponse.json({ success: true, uploads });
  } catch (error: any) {
    console.error("Erro na API de upload R2:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao enviar arquivo para o Cloudflare R2" },
      { status: 500 }
    );
  }
}
