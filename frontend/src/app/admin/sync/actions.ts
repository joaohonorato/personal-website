"use server";

import { apiFetch } from "@/lib/api";
import { revalidatePath } from "next/cache";

export async function syncGitHub(): Promise<{ synced: number; error?: string }> {
  try {
    const result = await apiFetch<{ synced: number }>(
      "/api/github/sync",
      { method: "POST" },
      true
    );
    revalidatePath("/admin/sync");
    revalidatePath("/admin/projects");
    return { synced: result.synced };
  } catch (err) {
    return { synced: 0, error: String(err) };
  }
}
