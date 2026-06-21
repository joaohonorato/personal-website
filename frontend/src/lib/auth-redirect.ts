/**
 * Call after a fetch() in a client component.
 * If the response is 401, redirects to login and returns true (caller should bail out).
 */
export function redirectIfUnauthorized(status: number): boolean {
  if (status === 401) {
    window.location.href = "/admin/login?error=session_expired";
    return true;
  }
  return false;
}
