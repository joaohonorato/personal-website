"use server";

import { createServiceClient } from "@/utils/supabase/service";
import { revalidatePath } from "next/cache";

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  topics: string[];
  private: boolean;
};

async function fetchAllRepos(token: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?visibility=all&per_page=100&page=${page}&sort=updated`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const data: GitHubRepo[] = await res.json();
    if (data.length === 0) break;

    repos.push(...data);
    if (data.length < 100) break;
    page++;
  }

  return repos;
}

export async function syncGitHub(): Promise<{ synced: number; error?: string }> {
  try {
    const repos = await fetchAllRepos(process.env.GITHUB_TOKEN!);

    const rows = repos.map((repo) => ({
      github_id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      topics: repo.topics ?? [],
      is_private: repo.private,
      synced_at: new Date().toISOString(),
    }));

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("github_repos")
      .upsert(rows, { onConflict: "github_id" });

    if (error) throw error;

    revalidatePath("/admin/sync");
    revalidatePath("/admin/projects");
    return { synced: rows.length };
  } catch (err) {
    return { synced: 0, error: String(err) };
  }
}
