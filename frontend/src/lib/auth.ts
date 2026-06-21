import { AUTH_URL } from "./config";

const AUTH_CLIENT_ID = process.env.AUTH_CLIENT_ID ?? "blog-frontend";
const AUTH_CLIENT_SECRET = process.env.AUTH_CLIENT_SECRET ?? "";

export const COOKIE_OPTS = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 90 * 24 * 60 * 60,
  path: "/",
};

export type RefreshResult = {
  accessToken: string;
  refreshToken?: string;
  roles: string[];
};

export async function callTokenRefresh(refreshToken: string): Promise<RefreshResult | null> {
  const credentials = Buffer.from(`${AUTH_CLIENT_ID}:${AUTH_CLIENT_SECRET}`).toString("base64");

  const res = await fetch(`${AUTH_URL}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json() as { access_token: string; refresh_token?: string };
  const accessToken = data.access_token;
  const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString());
  const roles: string[] = payload.roles ?? [];

  return { accessToken, refreshToken: data.refresh_token, roles };
}
