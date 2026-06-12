# personal-blog

Blog pessoal com design inspirado em HQ Batman. Next.js + Supabase + Drizzle ORM.

## Stack

- **Next.js 15** App Router + SSR on-demand
- **Supabase** PostgreSQL
- **Drizzle ORM** queries typesafe
- **Vercel** deploy

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha `.env.local`:
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
REVALIDATE_SECRET=gere-um-secret-forte-aqui
```

### 3. Migrations

```bash
npm run db:generate
npm run db:migrate
```

### 4. Dev

```bash
npm run dev
```

## API do agente

Para publicar um artigo via agente, faça um `POST /api/articles`:

```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Content-Type: application/json" \
  -H "x-revalidate-secret: seu-secret-aqui" \
  -d '{
    "title": "Título do artigo",
    "slug": "titulo-do-artigo",
    "excerpt": "Resumo curto",
    "content": "<p>Conteúdo HTML</p>",
    "category": "Dev",
    "tags": ["Next.js", "IA"]
  }'
```

A página é revalidada automaticamente após a publicação.

## Estrutura

```
src/
  app/
    page.tsx          → Home
    blog/
      page.tsx        → Listagem
      [slug]/
        page.tsx      → Post individual
    api/
      articles/
        route.ts      → Endpoint do agente
  db/
    schema.ts         → Schema Drizzle
    index.ts          → Conexão DB
  lib/
    posts.ts          → Queries reutilizáveis
```
