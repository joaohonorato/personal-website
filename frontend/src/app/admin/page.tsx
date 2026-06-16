import Link from "next/link";
import { cookies } from "next/headers";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("user_role")?.value === "ADMIN";

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "1px", marginBottom: "24px" }}>
        Dashboard
      </h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "3px", background: "#111", border: "3px solid #111" }}>
        <Link href="/admin/posts" style={{ textDecoration: "none" }}>
          <div style={{ background: "#fff", padding: "24px" }}>
            <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Gerenciar</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "20px" }}>Posts</div>
          </div>
        </Link>
        {isAdmin && (
          <Link href="/admin/projects" style={{ textDecoration: "none" }}>
            <div style={{ background: "#fff", padding: "24px" }}>
              <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Gerenciar</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "20px" }}>Projetos</div>
            </div>
          </Link>
        )}
        {isAdmin && (
          <Link href="/admin/sync" style={{ textDecoration: "none" }}>
            <div style={{ background: "#fff", padding: "24px" }}>
              <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Importar</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "20px" }}>Sync GitHub</div>
            </div>
          </Link>
        )}
        {isAdmin && (
          <Link href="/admin/users" style={{ textDecoration: "none" }}>
            <div style={{ background: "#fff", padding: "24px" }}>
              <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Gerenciar</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "20px" }}>Usuários</div>
            </div>
          </Link>
        )}
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
