import { signIn } from "@/app/admin/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F0E8" }}>
      <div style={{ width: "340px", border: "3px solid #111", background: "#fff", padding: "32px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", letterSpacing: "1px", marginBottom: "24px", borderBottom: "2px solid #111", paddingBottom: "12px" }}>
          ADMIN
        </div>

        <form action={signIn} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              style={{ border: "2px solid #111", padding: "8px 10px", fontSize: "14px", outline: "none", fontFamily: "inherit" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Senha
            </label>
            <input
              name="password"
              type="password"
              required
              style={{ border: "2px solid #111", padding: "8px 10px", fontSize: "14px", outline: "none", fontFamily: "inherit" }}
            />
          </div>

          {error === "invalid_credentials" && (
            <p style={{ fontSize: "12px", color: "#c00", margin: 0 }}>
              Email ou senha incorretos.
            </p>
          )}

          <button
            type="submit"
            style={{ background: "#111", color: "#F5F0E8", border: "none", padding: "10px", fontSize: "13px", fontWeight: 600, letterSpacing: "1px", cursor: "pointer", textTransform: "uppercase", marginTop: "4px" }}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
