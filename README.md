# Painel Administrativo — Cirlene Robalinho

Painel de controle editorial e gestão de acervo imobiliário de luxo da corretora **Cirlene Robalinho**. Desenvolvido em **Next.js 15 (App Router)** com **Tailwind CSS**, integrado ao **Supabase** (PostgreSQL + Auth + RLS) e ao **Cloudflare R2** (armazenamento de mídia de alta performance).

---

## 🏛️ Funcionalidades

- **Autenticação Segura:** Login protegido via Supabase Auth com persistência SSR em cookies e proteção por middleware.
- **Gestão de Imóveis (CRUD Completo):**
  - Cadastro de novos imóveis seguindo o template oficial do catálogo.
  - Edição completa de todos os campos: título, subtítulo, conceito, descrição, copy comercial, localização, valores, specs estruturais, comodidades e status de obra.
  - Exclusão com confirmação de segurança em dois passos.
  - **Alternância Instantânea de Visibilidade:** Oculte/desative imóveis da vitrine pública com 1 clique sem deletar os registros do banco de dados.
- **Galeria Multimídia com Cloudflare R2:**
  - Upload direto de múltiplas fotos e vídeos para o bucket S3-compatible `cirlene-catalogo`.
  - Pré-visualização imediata, reordenação e seleção de foto de capa (destaque).
- **Sincronização em Tempo Real com o Catálogo:**
  - Disparo de webhook de revalidação sob demanda (`revalidateTag("imoveis")`) a cada modificação, mantendo o catálogo público sempre atualizado instantaneamente.
- **Filtros e Busca Rápida:**
  - Busca textual em tempo real por título, código ou cidade.
  - Filtros por categoria (`Lançamentos`, `Revendas`, `Investimentos`, `Fazendas`), subcategoria e status de publicação.
- **Design Editorial Luxury:** Interface com paleta refinada (tons de café, ouro fosco, bronze e bordas finas), desenhada sob medida para o público de alto padrão.

---

## 🛠️ Tecnologias Utilizadas

- **Framework:** Next.js 15 (App Router, Server Actions & Route Handlers)
- **Linguagem:** TypeScript 5
- **Estilização:** Tailwind CSS v4 + Lucide Icons
- **Banco de Dados & Autenticação:** Supabase (@supabase/ssr, @supabase/supabase-js)
- **Armazenamento de Mídia:** Cloudflare R2 (@aws-sdk/client-s3)
- **Sincronização de Cache:** Next.js On-Demand ISR Revalidation

---

## 📋 Pré-requisitos e Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://sua-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Cloudflare R2
R2_ACCOUNT_ID=seu-account-id
R2_ACCESS_KEY_ID=sua-access-key
R2_SECRET_ACCESS_KEY=sua-secret-key
R2_BUCKET=cirlene-catalogo
R2_PUBLIC_URL=https://pub-seu-endpoint.r2.dev

# Catálogo Sincronização
NEXT_PUBLIC_CATALOGO_URL=http://localhost:3000
REVALIDATE_SECRET=cirlene_revalidate_secret_2026
```

---

## 🚀 Como Executar

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Execute o servidor de desenvolvimento:**
   ```bash
   npm run dev -- -p 3001
   ```

3. **Acesse no navegador:**
   - Painel: `http://localhost:3001`
   - Login: `cirlene@cirlenerobalinho.com.br`

---

## 📦 Estrutura de Diretórios

```
painel-admin-cirlene/
├── app/
│   ├── admin/
│   │   ├── imovel/
│   │   │   ├── [id]/page.tsx      # Edição de imóvel
│   │   │   └── novo/page.tsx      # Cadastro de novo imóvel
│   │   ├── layout.tsx             # Layout protegido com navegação
│   │   └── page.tsx               # Dashboard com listagem e métricas
│   ├── api/
│   │   ├── revalidate-catalogo/   # Webhook para atualizar cache do catálogo
│   │   └── upload/                # Endpoint de upload direto para Cloudflare R2
│   ├── login/                     # Tela de autenticação com design luxury
│   ├── globals.css                # Estilos globais e tema
│   └── layout.tsx                 # Root layout com fontes e metadados
├── components/
│   └── ImovelForm.tsx             # Formulário completo e reutilizável com R2
├── lib/
│   ├── r2.ts                      # Cliente e utilitários Cloudflare R2
│   ├── sync.ts                    # Disparador de revalidação instantânea
│   ├── taxonomia.ts               # Categorias, comodidades e formatações
│   ├── types.ts                   # Tipagens TypeScript estritas
│   └── supabase/                  # Clientes SSR, Browser e Admin (Service Role)
└── middleware.ts                  # Proteção de rotas administrativas
```

---

## 🔒 Segurança

- Todas as rotas `/admin/*` exigem sessão ativa validada pelo `middleware.ts`.
- Mutações críticas e uploads utilizam políticas de proteção e credenciais seguras de servidor.
