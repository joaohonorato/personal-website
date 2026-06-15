"use server";

import { apiFetch } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  await apiFetch("/api/projects", {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      repoIds: formData.getAll("repo_ids").map(Number).filter(Boolean),
      postIds: formData.getAll("post_ids").map(Number).filter(Boolean),
    }),
  }, true);

  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  redirect("/admin/projects");
}

export async function updateProject(id: number, formData: FormData) {
  await apiFetch(`/api/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      repoIds: formData.getAll("repo_ids").map(Number).filter(Boolean),
      postIds: formData.getAll("post_ids").map(Number).filter(Boolean),
    }),
  }, true);

  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  redirect("/admin/projects");
}

export async function deleteProject(id: number) {
  await apiFetch(`/api/projects/${id}`, { method: "DELETE" }, true);
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
}
