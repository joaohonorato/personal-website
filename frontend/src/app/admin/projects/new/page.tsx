import { apiFetch } from "@/lib/api";
import type { GithubRepo, PostSummary } from "@/types";
import { createProject } from "../actions";
import { ProjectForm } from "../ProjectForm";

export default async function NewProjectPage() {
  const [repos, posts] = await Promise.all([
    apiFetch<GithubRepo[]>("/api/github/repos", {}, true).catch(() => [] as GithubRepo[]),
    apiFetch<PostSummary[]>("/api/posts").catch(() => [] as PostSummary[]),
  ]);

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "1px", marginBottom: "28px" }}>
        Novo Projeto
      </h1>
      <ProjectForm action={createProject} repos={repos} posts={posts} />
    </div>
  );
}