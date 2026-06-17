import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { Project, RepoSummary, PostSummary } from "@/types";

async function getProjects(): Promise<Project[]> {
  return apiFetch<Project[]>("/api/projects", { next: { revalidate: 60 } } as RequestInit).catch(() => []);
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="container">
      <div className="section-header" style={{ marginBottom: "16px" }}>
        <span className="section-label">Projetos</span>
        <div className="section-line" />
        <span style={{ fontSize: "11px", color: "#888" }}>{projects.length} projetos</span>
      </div>

      {projects.length === 0 ? (
        <p style={{ color: "#888", fontSize: "14px" }}>Nenhum projeto publicado ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", background: "#111" }}>
          {projects.map((project) => (
            <div
              key={project.id}
              style={{ background: "#fff", display: "grid", gridTemplateColumns: "1fr 260px", borderTop: "none" }}
            >
              <div style={{ padding: "24px 28px", borderRight: "3px solid #111" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "1px", marginBottom: "8px" }}>
                  {project.name}
                </h2>
                <p style={{ fontSize: "13px", color: "#444", lineHeight: "1.6", marginBottom: "20px" }}>
                  {project.description}
                </p>

                {project.repos.length > 0 && (
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
                      Repositórios
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {project.repos.map((repo: RepoSummary) => (
                        <a
                          key={repo.id}
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#111", textDecoration: "none", width: "fit-content" }}
                        >
                          <span style={{ fontFamily: "var(--font-story)" }}>{repo.name}</span>
                          <span style={{ fontSize: "12px", color: "#888" }}>↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: "24px 20px", background: "#F5F0E8" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "12px", letterSpacing: "1.5px", borderBottom: "2px solid #111", paddingBottom: "6px", marginBottom: "12px", textTransform: "uppercase" }}>
                  Artigos
                </div>
                {project.posts.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>Nenhum artigo ainda.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {project.posts.map((post: PostSummary) => (
                      <Link
                        key={post.id}
                        href={`/blog/${post.slug}`}
                        style={{ display: "block", textDecoration: "none" }}
                      >
                        <div style={{ fontSize: "12px", color: "#111", lineHeight: "1.4", fontFamily: "var(--font-story)" }}>
                          {post.title}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
