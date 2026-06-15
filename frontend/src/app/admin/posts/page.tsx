import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { deletePost } from "./actions";

type Post = {
  id: number;
  title: string;
  slug: string;
  category: string;
  published: boolean;
  readingTimeMin: number;
  createdAt: string;
};

export default async function AdminPostsPage() {
  const posts = await apiFetch<Post[]>("/api/posts/all", {}, true).catch(() => [] as Post[]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "1px" }}>
          Posts
        </h1>
        <Link
          href="/admin/posts/new"
          style={{ background: "#111", color: "#F5F0E8", padding: "8px 18px", fontSize: "13px", fontWeight: 600, letterSpacing: "1px", textDecoration: "none", textTransform: "uppercase" }}
        >
          + Novo
        </Link>
      </div>

      {!posts.length ? (
        <p style={{ color: "#888", fontSize: "14px" }}>Nenhum post ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", background: "#111" }}>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{ background: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "10px", fontWeight: 700, padding: "2px 8px",
                      background: post.published ? "#111" : "#eee",
                      color: post.published ? "#F5F0E8" : "#888",
                      letterSpacing: "0.5px", textTransform: "uppercase",
                    }}
                  >
                    {post.published ? "publicado" : "rascunho"}
                  </span>
                  <span style={{ fontSize: "11px", color: "#888" }}>{post.category}</span>
                  <span style={{ fontSize: "11px", color: "#bbb" }}>{post.readingTimeMin} min</span>
                </div>
                <div style={{ fontFamily: "var(--font-story)", fontSize: "15px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {post.title}
                </div>
                <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>/blog/{post.slug}</div>
              </div>

              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <Link href={`/blog/${post.slug}`} target="_blank" style={{ border: "2px solid #ddd", padding: "6px 12px", fontSize: "12px", textDecoration: "none", color: "#888" }}>
                  Ver ↗
                </Link>
                <Link href={`/admin/posts/${post.id}/edit`} style={{ border: "2px solid #111", padding: "6px 14px", fontSize: "12px", fontWeight: 600, textDecoration: "none", color: "#111" }}>
                  Editar
                </Link>
                <form action={async () => { "use server"; await deletePost(post.id); }}>
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