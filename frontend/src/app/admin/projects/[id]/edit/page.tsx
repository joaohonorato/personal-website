import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Project, GithubRepo, PostSummary } from "@/types";
import { updateProject } from "../../actions";
import { ProjectForm } from "../../ProjectForm";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, repos, posts] = await Promise.all([
    apiFetch<Project>(`/api/projects/${id}`, {}, true).catch(() => null),
    apiFetch<GithubRepo[]>("/api/github/repos", {}, true).catch(() => [] as GithubRepo[]),
    apiFetch<PostSummary[]>("/api/posts").catch(() => [] as PostSummary[]),
  ]);

  if (!project) notFound();

  const action = updateProject.bind(null, Number(id));

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "1px", marginBottom: "28px" }}>
        Editar — {project.name}
      </h1>
      <ProjectForm
        action={action}
        repos={repos}
        posts={posts}
        defaultValues={{
          name: project.name,
          description: project.description,
          repoIds: project.repos.map((r) => r.id!),
          postIds: project.posts.map((p) => p.id!),
        }}
      />
    </div>
  );
}