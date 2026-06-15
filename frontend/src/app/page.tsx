import Link from "next/link";
import { getAllPosts, Post } from "@/lib/posts";

export const dynamic = "force-dynamic";

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function Home() {
  const posts = await getAllPosts();
  const featured = posts[0] ?? null;
  const recent = posts.slice(1, 5);
  const grid = posts.slice(0, 3);

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
        <div className="main">

          {/* Hero */}
          {featured && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", border: "3px solid #111" }}>
              <div className="dots-bg" style={{ background: "#111", padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "260px", position: "relative" }}>
                <div>
                  <span className="badge" style={{ marginBottom: "14px", display: "inline-block" }}>
                    {featured.category} · Destaque
                  </span>
                  <h1 style={{ fontFamily: "var(--font-display)", fontSize: "34px", color: "#F5F0E8", letterSpacing: "1px", lineHeight: "1.1", marginBottom: "12px" }}>
                    {featured.title}
                  </h1>
                  <p style={{ fontSize: "13px", color: "#aaa", lineHeight: "1.6", marginBottom: "18px" }}>
                    {featured.excerpt}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#666", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                    {formatDate(featured.createdAt)} · {featured.readingTimeMin} min
                  </span>
                  <Link href={`/blog/${featured.slug}`} className="badge" style={{ textDecoration: "none" }}>
                    Ler artigo
                  </Link>
                </div>
              </div>
              <div style={{ background: "#F5F0E8", borderLeft: "3px solid #111", padding: "20px 16px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", letterSpacing: "1.5px", borderBottom: "2px solid #111", paddingBottom: "6px", marginBottom: "12px" }}>
                  Recentes
                </div>
                {recent.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} style={{ display: "block", borderBottom: "1px solid #11112220", paddingBottom: "10px", marginBottom: "10px", textDecoration: "none" }}>
                    <div style={{ fontSize: "10px", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "3px" }}>{post.category}</div>
                    <div style={{ fontFamily: "var(--font-story)", fontSize: "13px", color: "#111", lineHeight: "1.3" }}>{post.title}</div>
                    <div style={{ fontSize: "10px", color: "#888", marginTop: "3px" }}>{formatDate(post.createdAt)}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Posts grid */}
          <div className="section-header">
            <span className="section-label">Últimos posts</span>
            <div className="section-line" />
            <span style={{ fontSize: "11px", color: "#888" }}>{posts.length} artigos</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", background: "#111", border: "3px solid #111" }}>
            {grid.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

        </div>
      </div>
    </>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
      <div className="comic-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div className="comic-card-header">
          <span>{post.category}</span>
          <span style={{ fontSize: "10px", color: "#555" }}>{post.readingTimeMin} min</span>
        </div>
        <div className="comic-card-body" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
          {post.generatedByAgent && (
            <span style={{ display: "inline-block", background: "#FFD700", border: "2px solid #111", borderRadius: "10px", padding: "4px 10px", fontSize: "11px", color: "#111", fontWeight: 500, marginBottom: "4px" }}>
              Gerado por agente
            </span>
          )}
          <div style={{ fontFamily: "var(--font-story)", fontSize: "14px", color: "#111", lineHeight: "1.35" }}>
            {post.title}
          </div>
          <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.5", flex: 1 }}>
            {post.excerpt}
          </div>
        </div>
        <div style={{ padding: "8px 12px", borderTop: "1px solid #11111215", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(post.createdAt))}
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            {(post.tags ?? []).slice(0, 2).map((tag) => (
              <span key={tag} className="badge-outline">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
