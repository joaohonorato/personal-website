import { apiFetch } from "@/lib/api";
import type { Post } from "@/types";

export type { Post };

export async function getAllPosts(): Promise<Post[]> {
  return apiFetch<Post[]>("/api/posts", { next: { revalidate: 60 } } as RequestInit);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return apiFetch<Post>(`/api/posts/${slug}`, { next: { revalidate: 60 } } as RequestInit).catch(() => null);
}