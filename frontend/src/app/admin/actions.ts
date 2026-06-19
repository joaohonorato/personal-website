"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/config";

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    redirect("/admin/login?error=invalid_credentials");
  }

  const data = await res.json();
  const token: string = data.token;
  // Suporte ao formato antigo (role: string) enquanto o backend não for redeploy
  const roles: string[] = Array.isArray(data.roles) ? data.roles : [data.role].filter(Boolean);

  const cookieStore = await cookies();
  const cookieOpts = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  };
  cookieStore.set("auth_token", token, { ...cookieOpts, httpOnly: true });
  cookieStore.set("user_roles", roles.join(","), { ...cookieOpts, httpOnly: false });

  redirect("/admin");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  cookieStore.delete("user_roles");
  redirect("/admin/login");
}