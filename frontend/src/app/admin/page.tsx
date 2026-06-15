import Link from "next/link";

export default function AdminPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "1px", marginBottom: "24px" }}>
        Dashboard
      </h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "3px", background: "#111", border: "3px solid #111" }}>
        <Link href="/admin/posts" style={{ textDecoration: "none" }}>
          <div style={{ background: "#fff", padding: "24px" }}>
            <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Gerenciar</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "20px" }}>Posts</div>
          </div>
        </Link>
        <Link href="/admin/projects" style={{ textDecoration: "none" }}>
          <div style={{ background: "#fff", padding: "24px" }}>
            <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Gerenciar</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "20px" }}>Projetos</div>
          </div>
        </Link>
        <Link href="/admin/sync" style={{ textDecoration: "none" }}>
          <div style={{ background: "#fff", padding: "24px" }}>
            <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Importar</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "20px" }}>Sync GitHub</div>
          </div>
        </Link>
        <Link href="/blog" style={{ textDecoration: "none" }}>
          <div style={{ background: "#fff", padding: "24px" }}>
            <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Ver site</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "20px" }}>Blog</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
