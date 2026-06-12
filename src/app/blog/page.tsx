import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default async function BlogPage() {
  const posts = await getAllPosts();

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
          <span className="section-label">Blog</span>
          <div className="section-line" />
          <span style={{ fontSize: "11px", color: "#888" }}>{posts.length} artigos</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", background: "#111", border: "3px solid #111" }}>
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
              <div className="comic-card" style={{ height: "100%" }}>
                <div className="comic-card-header">
                  <span>{post.category}</span>
                  <span style={{ fontSize: "10px", color: "#555" }}>{post.readingTimeMin} min</span>
                </div>
                <div className="comic-card-body">
                  {post.generatedByAgent && (
                    <span style={{ display: "inline-block", background: "#FFD700", border: "2px solid #111", borderRadius: "10px", padding: "3px 8px", fontSize: "11px", color: "#111", marginBottom: "6px" }}>
                      Gerado por agente
                    </span>
                  )}
                  <div style={{ fontFamily: "var(--font-story)", fontSize: "14px", lineHeight: "1.35", marginBottom: "6px" }}>{post.title}</div>
                  <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.5" }}>{post.excerpt}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
