import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/config";
import { callTokenRefresh, COOKIE_OPTS } from "@/lib/auth";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  withAuth = false
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const cookieStore = await cookies();

  if (withAuth) {
    const token = cookieStore.get("auth_token")?.value;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: options.cache ?? "no-store",
  });

  if (res.status === 401) {
    if (withAuth) {
      const rt = cookieStore.get("refresh_token")?.value;
      if (rt) {
        const result = await callTokenRefresh(rt);
        if (result) {
          cookieStore.set("auth_token", result.accessToken, { ...COOKIE_OPTS, httpOnly: true });
          cookieStore.set("user_roles", result.roles.join(","), { ...COOKIE_OPTS, httpOnly: false });
          if (result.refreshToken) {
            cookieStore.set("refresh_token", result.refreshToken, { ...COOKIE_OPTS, httpOnly: true });
          }
          const retryHeaders = { ...headers, "Authorization": `Bearer ${result.accessToken}` };
          const retry = await fetch(`${API_URL}${path}`, { ...options, headers: retryHeaders, cache: "no-store" });
          if (retry.ok) {
            if (retry.status === 204) return undefined as T;
            return retry.json() as Promise<T>;
          }
        }
      }
    }
    redirect("/admin/login?error=session_expired");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
