import { createClient } from "@supabase/supabase-js";
import type { Post } from "@/db/schema";

type DbRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[] | null;
  published: boolean;
  generated_by_agent: boolean;
  reading_time_min: number;
  created_at: string;
  updated_at: string;
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

function toPost(row: DbRow): Post {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    tags: row.tags,
    published: row.published,
    generatedByAgent: row.generated_by_agent,
    readingTimeMin: row.reading_time_min,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function getAllPosts(): Promise<Post[]> {
  const { data, error } = await getSupabase()
    .from("posts")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as DbRow[]).map(toPost);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const { data, error } = await getSupabase()
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return toPost(data as DbRow);
}
