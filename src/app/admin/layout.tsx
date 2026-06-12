import Link from "next/link";
import { signOut } from "@/app/admin/actions";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F0E8" }}>
      <nav style={{ borderBottom: "3px solid #111", background: "#111", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <span style={{ fontFamily: "var(--font-display)", color: "#F5F0E8", fontSize: "16px", letterSpacing: "2px" }}>
            ADMIN
          </span>
          <Link href="/admin" style={{ color: "#aaa", fontSize: "13px", textDecoration: "none" }}>Dashboard</Link>
          <Link href="/admin/projects" style={{ color: "#aaa", fontSize: "13px", textDecoration: "none" }}>Projetos</Link>
          <Link href="/admin/sync" style={{ color: "#aaa", fontSize: "13px", textDecoration: "none" }}>Sync GitHub</Link>
        </div>
        <form action={signOut}>
          <button type="submit" style={{ background: "none", border: "1px solid #444", color: "#aaa", padding: "4px 12px", fontSize: "12px", cursor: "pointer" }}>
            Sair
          </button>
        </form>
      </nav>
      <main style={{ padding: "32px 24px", maxWidth: "1100px", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
