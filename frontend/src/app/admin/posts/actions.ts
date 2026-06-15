"use server";

import { createServiceClient } from "@/utils/supabase/service";
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
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  const slug = (formData.get("slug") as string) || slugify(title);
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const category = formData.get("category") as string;
  const tags = parseTags(formData.get("tags") as string);
  const readingTimeMin = Number(formData.get("reading_time_min")) || 1;
  const published = formData.get("published") === "on";
  const generatedByAgent = formData.get("generated_by_agent") === "on";

  const supabase = createServiceClient();
  const { error } = await supabase.from("posts").insert({
    title,
    slug,
    excerpt,
    content,
    category,
    tags,
    reading_time_min: readingTimeMin,
    published,
    generated_by_agent: generatedByAgent,
  });

  if (error) throw error;

  revalidatePath("/blog");
  revalidatePath("/");
  redirect("/admin/posts");
}

export async function updatePost(id: number, formData: FormData) {
  const title = formData.get("title") as string;
  const slug = (formData.get("slug") as string) || slugify(title);
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const category = formData.get("category") as string;
  const tags = parseTags(formData.get("tags") as string);
  const readingTimeMin = Number(formData.get("reading_time_min")) || 1;
  const published = formData.get("published") === "on";
  const generatedByAgent = formData.get("generated_by_agent") === "on";

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("posts")
    .update({
      title,
      slug,
      excerpt,
      content,
      category,
      tags,
      reading_time_min: readingTimeMin,
      published,
      generated_by_agent: generatedByAgent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/");
  redirect("/admin/posts");
}

export async function deletePost(id: number) {
  const supabase = createServiceClient();
  await supabase.from("posts").delete().eq("id", id);
  revalidatePath("/blog");
  revalidatePath("/");
}
