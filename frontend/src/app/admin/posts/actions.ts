"use server";

import { apiFetch } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function parseTags(raw: string): string[] {
  return raw.split(",").map((t) => t.trim()).filter(Boolean);
}

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  const slug = (formData.get("slug") as string) || slugify(title);

  await apiFetch("/api/posts", {
    method: "POST",
    body: JSON.stringify({
      title, slug,
      excerpt: formData.get("excerpt") as string,
      content: formData.get("content") as string,
      category: formData.get("category") as string,
      tags: parseTags(formData.get("tags") as string),
      readingTimeMin: Number(formData.get("reading_time_min")) || 1,
      published: formData.get("published") === "on",
      generatedByAgent: formData.get("generated_by_agent") === "on",
    }),
  }, true);

  revalidatePath("/blog");
  revalidatePath("/");
  redirect("/admin/posts");
}

export async function updatePost(id: number, formData: FormData) {
  const title = formData.get("title") as string;
  const slug = (formData.get("slug") as string) || slugify(title);

  await apiFetch(`/api/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      title, slug,
      excerpt: formData.get("excerpt") as string,
      content: formData.get("content") as string,
      category: formData.get("category") as string,
      tags: parseTags(formData.get("tags") as string),
      readingTimeMin: Number(formData.get("reading_time_min")) || 1,
      published: formData.get("published") === "on",
      generatedByAgent: formData.get("generated_by_agent") === "on",
    }),
  }, true);

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/");
  redirect("/admin/posts");
}

export async function deletePost(id: number) {
  await apiFetch(`/api/posts/${id}`, { method: "DELETE" }, true);
  revalidatePath("/blog");
  revalidatePath("/");
}
