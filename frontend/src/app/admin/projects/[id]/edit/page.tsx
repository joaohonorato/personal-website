import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { updateProject } from "../../actions";
import { ProjectForm } from "../../ProjectForm";

type Repo = { id: number; name: string; fullName: string; isPrivate: boolean };
type Post = { id: number; title: string; slug: string };
type Project = {
  id: number; name: string; description: string;
  repos: Repo[]; posts: Post[];
};

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, repos, posts] = await Promise.all([
    apiFetch<Project>(`/api/projects/${id}`, {}, true).catch(() => null),
    apiFetch<Repo[]>("/api/github/repos", {}, true).catch(() => [] as Repo[]),
    apiFetch<Post[]>("/api/posts").catch(() => [] as Post[]),
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