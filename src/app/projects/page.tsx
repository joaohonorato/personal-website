import Link from "next/link";
import { createServiceClient } from "@/utils/supabase/service";

type Repo = {
  id: number;
  name: string;
  full_name: string;
  url: string;
  is_private: boolean;
};

type Post = {
  id: number;
  title: string;
  slug: string;
};

type Project = {
  id: number;
  name: string;
  description: string;
  project_repos: { github_repos: Repo[] }[];
  post_projects: { posts: Post[] }[];
};

async function getProjects(): Promise<Project[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .select(`
      id, name, description,
      project_repos ( github_repos ( id, name, full_name, url, is_private ) ),
      post_projects ( posts ( id, title, slug ) )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Project[];
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="nav-logo">personal-blog</Link>
        <ul className="nav-links">
          <li><Link href="/blog">Blog</Link></li>
          <li><Link href="/projects">Projetos</Link></li>
          <li><Link href="/about">Sobre</Link></li>
        </ul>
      </nav>

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
            {projects.map((project) => {
              const allRepos = project.project_repos.flatMap((r) => r.github_repos);
              const posts = project.post_projects.flatMap((p) => p.posts);

              return (
                <div
                  key={project.id}
                  style={{ background: "#fff", display: "grid", gridTemplateColumns: "1fr 260px", borderTop: "none" }}
                >
                  {/* Main content */}
                  <div style={{ padding: "24px 28px", borderRight: "3px solid #111" }}>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "1px", marginBottom: "8px" }}>
                      {project.name}
                    </h2>
                    <p style={{ fontSize: "13px", color: "#444", lineHeight: "1.6", marginBottom: "20px" }}>
                      {project.description}
                    </p>

                    {allRepos.length > 0 && (
                      <div>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
                          Repositórios
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {allRepos.map((repo) => (
                            <a
                              key={repo.id}
                              href={repo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#111", textDecoration: "none", width: "fit-content" }}
                            >
                              <span style={{ fontFamily: "var(--font-story)" }}>{repo.name}</span>
                              {repo.is_private && (
                                <span style={{ fontSize: "9px", color: "#888", border: "1px solid #ccc", padding: "1px 5px", lineHeight: "1.4" }}>privado</span>
                              )}
                              <span style={{ fontSize: "12px", color: "#888" }}>↗</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Related posts sidebar */}
                  <div style={{ padding: "24px 20px", background: "#F5F0E8" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "12px", letterSpacing: "1.5px", borderBottom: "2px solid #111", paddingBottom: "6px", marginBottom: "12px", textTransform: "uppercase" }}>
                      Artigos
                    </div>
                    {posts.length === 0 ? (
                      <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>Nenhum artigo ainda.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {posts.map((post) => (
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
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
