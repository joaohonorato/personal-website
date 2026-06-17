import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F0E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "96px", letterSpacing: "4px", lineHeight: 1 }}>
          404
        </div>
        <div style={{ fontFamily: "var(--font-story)", fontSize: "18px", color: "#555", margin: "16px 0 32px" }}>
          Página não encontrada
        </div>
        <Link
          href="/"
          style={{ background: "#111", color: "#F5F0E8", padding: "10px 28px", textDecoration: "none", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
