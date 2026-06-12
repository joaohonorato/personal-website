import { createServiceClient } from "@/utils/supabase/service";
import { createProject } from "../actions";
import { ProjectForm } from "../ProjectForm";

export default async function NewProjectPage() {
  const supabase = createServiceClient();

  const [{ data: repos }, { data: posts }] = await Promise.all([
    supabase.from("github_repos").select("id, name, full_name, is_private").order("name"),
    supabase.from("posts").select("id, title, slug").eq("published", true).order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "1px", marginBottom: "28px" }}>
        Novo Projeto
      </h1>
      <ProjectForm
        action={createProject}
        repos={repos ?? []}
        posts={posts ?? []}
      />
    </div>
  );
}
