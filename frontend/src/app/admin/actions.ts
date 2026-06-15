"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const password = formData.get("password") as string;

  if (!password || password !== process.env.ADMIN_SECRET) {
    redirect("/admin/login?error=invalid_credentials");
  }

  const cookieStore = await cookies();
  cookieStore.set("admin_session", process.env.ADMIN_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  redirect("/admin");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  redirect("/admin/login");
}