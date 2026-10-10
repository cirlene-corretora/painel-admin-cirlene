import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Painel Administrativo · Cirlene Robalinho Corretora",
  description: "Gerenciamento completo de imóveis e catálogo - Cirlene Robalinho (CRECI 4265)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-espresso text-creme antialiased selection:bg-ouro/30 selection:text-ouro-claro">
        {children}
      </body>
    </html>
  );
}
