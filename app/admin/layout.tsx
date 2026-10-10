"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const linkAtivo = (caminho: string) => {
    return pathname === caminho
      ? "text-ouro bg-cafe-leve border border-ouro/30 font-semibold"
      : "text-creme/70 hover:text-ouro-claro hover:bg-cafe/50";
  };

  return (
    <div className="min-h-screen flex flex-col bg-espresso">
      {/* Barra de Topo */}
      <header className="sticky top-0 z-40 bg-cafe/95 backdrop-blur-md border-b border-ouro-suave px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo e Identidade */}
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="size-10 rounded-full border border-ouro-medio bg-espresso flex items-center justify-center text-ouro font-serif text-lg font-bold group-hover:border-ouro transition-colors">
              C
            </div>
            <div>
              <span className="block font-serif text-base tracking-wider text-ouro-claro font-semibold uppercase leading-tight">
                Cirlene Robalinho
              </span>
              <span className="block text-[0.625rem] tracking-widest uppercase text-creme-mutado">
                Painel Administrativo · CRECI 4265
              </span>
            </div>
          </Link>

          {/* Navegação e Ações Rápidas */}
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/admin"
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-all ${linkAtivo(
                  "/admin"
                )}`}
              >
                Imóveis
              </Link>
              <Link
                href="/admin/imovel/novo"
                className="px-3 sm:px-4 py-2 rounded-lg btn-ouro text-xs uppercase tracking-wider font-semibold transition-all"
              >
                + Novo Imóvel
              </Link>
            </nav>

            <div className="h-5 w-px bg-ouro/20 mx-1 hidden sm:block" />

            {/* Ver Catálogo Público */}
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ouro/30 text-[0.6875rem] uppercase tracking-wider text-ouro-claro hover:bg-ouro/10 transition-colors"
              title="Abrir o catálogo em tempo real"
            >
              <span>Ver Catálogo</span>
              <svg
                className="size-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>

            {/* Sair */}
            <button
              onClick={handleLogout}
              className="p-2 text-creme-mutado hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
              title="Sair do painel"
            >
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        {children}
      </main>
    </div>
  );
}
