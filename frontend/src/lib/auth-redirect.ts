export async function redirectIfUnauthorized(status: number): Promise<boolean> {
  if (status !== 401) return false;

  try {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    if (res.ok) {
      window.location.reload();
      return true;
    }
  } catch {}

  window.location.href = "/admin/login?error=session_expired";
  return true;
}
