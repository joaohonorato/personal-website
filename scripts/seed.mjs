import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

const posts = [
  {
    slug: "como-construi-agente-que-publica-artigos",
    title: "Como construí um agente que publica artigos automaticamente",
    excerpt: "Arquitetura, decisões técnicas e os erros que cometi ao integrar LLMs com Next.js e Supabase.",
    content: "<p>Este é o conteúdo completo do artigo sobre o agente de publicação.</p><p>Aqui entraria o texto completo gerado pelo agente de IA.</p>",
    category: "IA",
    tags: ["LLM", "Next.js", "Supabase"],
    published: true,
    generated_by_agent: true,
    reading_time_min: 8,
  },
  {
    slug: "ssr-vs-ssg-quando-cada-um-faz-sentido",
    title: "SSR vs SSG — quando cada um faz sentido de verdade",
    excerpt: "Uma análise sem achismo sobre quando usar renderização no servidor.",
    content: "<p>SSR e SSG são frequentemente mal compreendidos. Vamos desmistificar cada um.</p>",
    category: "Dev",
    tags: ["Next.js", "Perf"],
    published: true,
    generated_by_agent: false,
    reading_time_min: 5,
  },
  {
    slug: "drizzle-orm-na-pratica",
    title: "Drizzle ORM na prática — vale a pena?",
    excerpt: "Testei o Drizzle em produção por 3 meses. Aqui está o que aprendi.",
    content: "<p>Drizzle ORM é uma das melhores escolhas para projetos TypeScript modernos.</p>",
    category: "Dev",
    tags: ["Drizzle", "TypeScript"],
    published: true,
    generated_by_agent: false,
    reading_time_min: 6,
  },
  {
    slug: "portfolio-v3-decisoes-de-design",
    title: "Portfolio v3 — decisões de design e stack",
    excerpt: "O que mudei, o que mantive e por que escolhi o tema Batman.",
    content: "<p>Redesenhar um portfolio é sempre uma oportunidade de repensar tudo do zero.</p>",
    category: "Projetos",
    tags: ["UI", "UX"],
    published: true,
    generated_by_agent: false,
    reading_time_min: 4,
  },
  {
    slug: "automacao-com-ia-em-2026",
    title: "Automação com IA em 2026 — o que mudou",
    excerpt: "O ecossistema de automação evoluiu muito. Minha visão atual sobre as melhores ferramentas.",
    content: "<p>A automação com IA atingiu um nível de maturidade impressionante nos últimos anos.</p>",
    category: "Automação",
    tags: ["IA", "Automação"],
    published: true,
    generated_by_agent: true,
    reading_time_min: 7,
  },
];

const { data, error } = await supabase.from("posts").insert(posts).select("id, slug");

if (error) {
  console.error("Erro ao inserir posts:", error.message);
  if (error.message.includes("row-level security")) {
    console.error("\nHint: A tabela tem RLS ativo. Adicione uma policy de INSERT para a role anon no Supabase Dashboard.");
  }
  process.exit(1);
}

console.log(`✓ ${data.length} posts inseridos:`);
data.forEach((p) => console.log(`  - [${p.id}] ${p.slug}`));
