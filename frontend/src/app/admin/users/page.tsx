import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { User } from "@/types";
import { deleteUser } from "./actions";
import { DeleteButton } from "@/app/admin/components/DeleteButton";

const roleBadge: Record<string, React.CSSProperties> = {
  ADMIN:   { background: "#111", color: "#F5F0E8" },
  WRITER:  { background: "#2563eb", color: "#fff" },
  READER:  { background: "#eee", color: "#666" },
  AI_USER: { background: "#FFD700", color: "#111" },
};

export default async function AdminUsersPage() {
  let users: User[] = [];
  let fetchError = false;

  try {
    users = await apiFetch<User[]>("/api/users", {}, true);
  } catch {
    fetchError = true;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "1px" }}>
          Usuários
        </h1>
        <Link
          href="/admin/users/new"
          style={{ background: "#111", color: "#F5F0E8", padding: "8px 18px", fontSize: "13px", fontWeight: 600, letterSpacing: "1px", textDecoration: "none", textTransform: "uppercase" }}
        >
          + Novo
        </Link>
      </div>

      {fetchError ? (
        <p style={{ color: "#c00", fontSize: "14px" }}>Erro ao carregar usuários. Verifique se a API está acessível.</p>
      ) : !users.length ? (
        <p style={{ color: "#888", fontSize: "14px" }}>Nenhum usuário encontrado.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", background: "#111" }}>
          {users.map((user) => (
            <div
              key={user.id}
              style={{ background: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                  {user.roles.map((r) => (
                    <span key={r} style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", letterSpacing: "0.5px", textTransform: "uppercase", ...(roleBadge[r] ?? { background: "#eee", color: "#666" }) }}>
                      {r}
                    </span>
                  ))}
                </div>
                <div style={{ fontFamily: "var(--font-story)", fontSize: "15px", fontWeight: 600 }}>
                  {user.email}
                </div>
                <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>
                  Criado em {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <Link
                  href={`/admin/users/${user.id}/edit`}
                  style={{ border: "2px solid #111", padding: "6px 14px", fontSize: "12px", fontWeight: 600, textDecoration: "none", color: "#111" }}
                >
                  Editar
                </Link>
                <DeleteButton
                  action={async () => { "use server"; await deleteUser(user.id); }}
                  confirmMessage={`Excluir o usuário "${user.email}"?`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}