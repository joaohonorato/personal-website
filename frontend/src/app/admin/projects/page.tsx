import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { deleteProject } from "./actions";

type Project = {
  id: number;
  name: string;
  description: string;
  repos: { id: number }[];
  posts: { id: number }[];
};

export default async function AdminProjectsPage() {
  const projects = await apiFetch<Project[]>("/api/projects", {}, true).catch(() => [] as Project[]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "1px" }}>
          Projetos
        </h1>
        <Link
          href="/admin/projects/new"
          style={{ background: "#111", color: "#F5F0E8", padding: "8px 18px", fontSize: "13px", fontWeight: 600, letterSpacing: "1px", textDecoration: "none", textTransform: "uppercase" }}
        >
          + Novo
        </Link>
      </div>

      {!projects.length ? (
        <p style={{ color: "#888", fontSize: "14px" }}>Nenhum projeto ainda. Crie o primeiro.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", background: "#111" }}>
          {projects.map((project) => (
            <div key={project.id} style={{ background: "#fff", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "var(--font-story)", fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
                  {project.name}
                </div>
                <div style={{ fontSize: "13px", color: "#555", marginBottom: "8px" }}>
                  {project.description}
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {project.repos?.length ?? 0} repos
                  </span>
                  <span style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {project.posts?.length ?? 0} artigos
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Link href={`/admin/projects/${project.id}/edit`} style={{ border: "2px solid #111", padding: "6px 14px", fontSize: "12px", fontWeight: 600, textDecoration: "none", color: "#111" }}>
                  Editar
                </Link>
                <form action={async () => { "use server"; await deleteProject(project.id); }}>
                  <button type="submit" style={{ border: "2px solid #c00", padding: "6px 14px", fontSize: "12px", fontWeight: 600, background: "none", color: "#c00", cursor: "pointer" }}>
                    Excluir
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}