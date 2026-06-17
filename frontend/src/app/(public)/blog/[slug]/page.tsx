import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className="container" style={{ maxWidth: "780px" }}>
      <div style={{ margin: "24px 0 8px" }}>
        <span className="badge">{post.category}</span>
        {post.generatedByAgent && (
          <span style={{ marginLeft: "8px", display: "inline-block", background: "#FFD700", border: "2px solid #111", borderRadius: "10px", padding: "3px 10px", fontSize: "11px", color: "#111" }}>
            Gerado por agente
          </span>
        )}
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "42px", letterSpacing: "1px", lineHeight: "1.1", margin: "12px 0 8px" }}>
        {post.title}
      </h1>
      <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "24px", borderBottom: "2px solid #111", paddingBottom: "12px" }}>
        {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(post.createdAt))}
        {" · "}{post.readingTimeMin} min de leitura
      </div>
      <div
        style={{ fontFamily: "var(--font-body)", fontSize: "16px", lineHeight: "1.8", color: "#222" }}
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      <div style={{ marginTop: "32px", paddingTop: "16px", borderTop: "2px solid #111", display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {(post.tags ?? []).map((tag) => (
          <span key={tag} className="badge-outline">{tag}</span>
        ))}
      </div>
    </div>
  );
}
