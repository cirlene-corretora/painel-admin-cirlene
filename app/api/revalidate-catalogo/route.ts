import { NextRequest, NextResponse } from "next/server";
import { sincronizarCatalogo } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = body.slug;

    await sincronizarCatalogo(slug);

    return NextResponse.json({ success: true, revalidated: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Erro na revalidação:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao acionar revalidação" },
      { status: 500 }
    );
  }
}
