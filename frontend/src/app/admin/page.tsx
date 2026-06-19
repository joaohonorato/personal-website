import Link from "next/link";
import { cookies } from "next/headers";

function DashCard({ href, label, title, accent = false }: { href: string; label: string; title: string; accent?: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div className="dash-card" style={{
        background: accent ? "#FFD700" : "#fff",
        padding: "24px 28px",
        border: "2px solid #111",
        boxSizing: "border-box",
      }}>
        <div style={{ fontSize: "11px", color: accent ? "#555" : "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
          {label}
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "#111" }}>
          {title}
        </div>
      </div>
    </Link>
  );
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const userRoles = (cookieStore.get("user_roles")?.value ?? "").split(",").filter(Boolean);
  const isAdmin = userRoles.includes("ADMIN");

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "1px", marginBottom: "24px" }}>
        Dashboard
      </h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
        <DashCard href="/admin/posts" label="Gerenciar" title="Posts" />
        {isAdmin && <DashCard href="/admin/projects" label="Gerenciar" title="Projetos" />}
        {isAdmin && <DashCard href="/admin/sync" label="Importar" title="Sync GitHub" />}
        {isAdmin && <DashCard href="/admin/users" label="Gerenciar" title="Usuários" />}
        <DashCard href="/admin/posts/new" label="IA" title="⚡ Gerar Post" accent />
        <DashCard href="/blog" label="Ver site" title="Blog" />
      </div>
    </div>
  );
}
