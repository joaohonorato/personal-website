"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_URL } from "@/lib/config";

const AUTH_CLIENT_ID     = process.env.AUTH_CLIENT_ID     ?? "blog-frontend";
const AUTH_CLIENT_SECRET = process.env.AUTH_CLIENT_SECRET ?? "";

export async function signIn(formData: FormData) {
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;

  const body = new URLSearchParams({
    grant_type: "password",
    username:   email,
    password:   password,
  });

  const credentials = Buffer.from(`${AUTH_CLIENT_ID}:${AUTH_CLIENT_SECRET}`).toString("base64");

  const res = await fetch(`${AUTH_URL}/oauth2/token`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    redirect("/admin/login?error=invalid_credentials");
  }

  const data = await res.json() as { access_token: string; roles?: string[] };
  const token = data.access_token;

  // Decode roles from JWT payload (no verification needed here — server already validated)
  const payloadB64 = token.split(".")[1];
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
  const roles: string[] = payload.roles ?? [];

  const cookieStore = await cookies();
  const cookieOpts = {
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge:   30 * 24 * 60 * 60,
    path:     "/",
  };
  cookieStore.set("auth_token",  token,            { ...cookieOpts, httpOnly: true  });
  cookieStore.set("user_roles",  roles.join(","),  { ...cookieOpts, httpOnly: false });

  redirect("/admin");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  cookieStore.delete("user_roles");
  redirect("/admin/login");
}
