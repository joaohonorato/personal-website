"use server";

import { createServiceClient } from "@/utils/supabase/service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const repoIds = formData.getAll("repo_ids").map(Number).filter(Boolean);
  const postIds = formData.getAll("post_ids").map(Number).filter(Boolean);

  const supabase = createServiceClient();

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ name, description })
    .select()
    .single();

  if (error) throw error;

  if (repoIds.length > 0) {
    await supabase
      .from("project_repos")
      .insert(repoIds.map((repo_id) => ({ project_id: project.id, repo_id })));
  }

  if (postIds.length > 0) {
    await supabase
      .from("post_projects")
      .insert(postIds.map((post_id) => ({ project_id: project.id, post_id })));
  }

  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  redirect("/admin/projects");
}

export async function updateProject(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const repoIds = formData.getAll("repo_ids").map(Number).filter(Boolean);
  const postIds = formData.getAll("post_ids").map(Number).filter(Boolean);

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("projects")
    .update({ name, description, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  // Sync repos: delete all then re-insert
  await supabase.from("project_repos").delete().eq("project_id", id);
  if (repoIds.length > 0) {
    await supabase
      .from("project_repos")
      .insert(repoIds.map((repo_id) => ({ project_id: id, repo_id })));
  }

  // Sync posts: delete all then re-insert
  await supabase.from("post_projects").delete().eq("project_id", id);
  if (postIds.length > 0) {
    await supabase
      .from("post_projects")
      .insert(postIds.map((post_id) => ({ project_id: id, post_id })));
  }

  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  redirect("/admin/projects");
}

export async function deleteProject(id: number) {
  const supabase = createServiceClient();
  await supabase.from("projects").delete().eq("id", id);
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
}
