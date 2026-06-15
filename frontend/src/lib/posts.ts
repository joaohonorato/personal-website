import { apiFetch } from "./api";

export type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  published: boolean;
  generatedByAgent: boolean;
  readingTimeMin: number;
  createdAt: string;
  updatedAt: string;
};

export async function getAllPosts(): Promise<Post[]> {
  return apiFetch<Post[]>("/api/posts", { next: { revalidate: 60 } } as RequestInit);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return apiFetch<Post>(`/api/posts/${slug}`, { next: { revalidate: 60 } } as RequestInit).catch(() => null);
}