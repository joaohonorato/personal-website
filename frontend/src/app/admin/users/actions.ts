"use server";

import { apiFetch } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User, UserRole } from "@/types";

export type { User, UserRole };

export async function createUser(formData: FormData) {
  await apiFetch(
    "/api/users",
    {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        role: formData.get("role"),
      }),
    },
    true
  );
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUser(id: number, formData: FormData) {
  const body: Record<string, string> = {
    email: formData.get("email") as string,
    role: formData.get("role") as string,
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