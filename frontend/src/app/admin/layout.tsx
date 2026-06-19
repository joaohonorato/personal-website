import Link from "next/link";
import { cookies } from "next/headers";
import { signOut } from "@/app/admin/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const userRoles = (cookieStore.get("user_roles")?.value ?? "").split(",").filter(Boolean);
  const isAdmin = userRoles.includes("ADMIN");

  return (
    <div style={{ minHeight: "100vh", background: "#F5F0E8" }}>
      <nav style={{ borderBottom: "3px solid #111", background: "#111", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <span style={{ fontFamily: "var(--font-display)", color: "#F5F0E8", fontSize: "16px", letterSpacing: "2px" }}>
            ADMIN
          </span>
          <Link href="/admin" style={{ color: "#aaa", fontSize: "13px", textDecoration: "none" }}>Dashboard</Link>
          <Link href="/admin/posts" style={{ color: "#aaa", fontSize: "13px", textDecoration: "none" }}>Posts</Link>
          {isAdmin && (
            <Link href="/admin/projects" style={{ color: "#aaa", fontSize: "13px", textDecoration: "none" }}>Projetos</Link>
          )}
          {isAdmin && (
            <Link href="/admin/sync" style={{ color: "#aaa", fontSize: "13px", textDecoration: "none" }}>Sync GitHub</Link>
          )}
          {isAdmin && (
            <Link href="/admin/users" style={{ color: "#aaa", fontSize: "13px", textDecoration: "none" }}>Usuários</Link>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "11px", color: "#666", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            {userRoles.join(", ")}
          </span>
          <form action={signOut}>
            <button type="submit" style={{ background: "none", border: "1px solid #444", color: "#aaa", padding: "4px 12px", fontSize: "12px", cursor: "pointer" }}>
              Sair
            </button>
          </form>
        </div>
      </nav>
      <main style={{ padding: "32px 24px", maxWidth: "1100px", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
