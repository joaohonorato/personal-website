import { notFound } from "next/navigation";
import { createServiceClient } from "@/utils/supabase/service";
import { updateProject } from "../../actions";
import { ProjectForm } from "../../ProjectForm";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [
    { data: project },
    { data: repos },
    { data: posts },
    { data: projectRepos },
    { data: projectPosts },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("github_repos").select("id, name, full_name, is_private").order("name"),
    supabase.from("posts").select("id, title, slug").eq("published", true).order("created_at", { ascending: false }),
    supabase.from("project_repos").select("repo_id").eq("project_id", id),
    supabase.from("post_projects").select("post_id").eq("project_id", id),
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
        repos={repos ?? []}
        posts={posts ?? []}
        defaultValues={{
          name: project.name,
          description: project.description,
          repoIds: (projectRepos ?? []).map((r: { repo_id: number }) => r.repo_id),
          postIds: (projectPosts ?? []).map((p: { post_id: number }) => p.post_id),
        }}
      />
    </div>
  );
}
