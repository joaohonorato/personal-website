"use server";

import { apiFetch } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createUser(formData: FormData) {
  await apiFetch(
    "/api/users",
    {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        roles: formData.getAll("roles"),
      }),
    },
    true
  );
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUser(id: number, formData: FormData) {
  const body: Record<string, unknown> = {
    email: formData.get("email") as string,
    roles: formData.getAll("roles"),
  };
  const password = formData.get("password") as string;
  if (password) body.password = password;

  await apiFetch(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(body) }, true);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function deleteUser(id: number) {
  await apiFetch(`/api/users/${id}`, { method: "DELETE" }, true);
  revalidatePath("/admin/users");
}