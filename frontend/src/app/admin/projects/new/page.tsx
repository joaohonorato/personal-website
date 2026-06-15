import { apiFetch } from "@/lib/api";
import { createProject } from "../actions";
import { ProjectForm } from "../ProjectForm";

export default async function NewProjectPage() {
  const [repos, posts] = await Promise.all([
    apiFetch<{ id: number; name: string; fullName: string; isPrivate: boolean }[]>(
      "/api/github/repos", {}, true
    ).catch(() => []),
    apiFetch<{ id: number; title: string; slug: string }[]>(
      "/api/posts"
    ).catch(() => []),
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