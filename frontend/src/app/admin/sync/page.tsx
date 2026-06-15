import { apiFetch } from "@/lib/api";
import { syncGitHub } from "./actions";
import { SyncButton } from "./SyncButton";

type GithubRepo = { id: number; syncedAt: string };

async function getStats() {
  const repos = await apiFetch<GithubRepo[]>("/api/github/repos", {}, true).catch(() => []);
  const lastSync = repos.length > 0
    ? repos.sort((a, b) => b.syncedAt.localeCompare(a.syncedAt))[0].syncedAt
    : null;
  return { total: repos.length, lastSync };
}

async function syncAction(
  _prev: { synced: number; error?: string } | null,
  _formData: FormData
) {
  "use server";
  return syncGitHub();
}

export default async function SyncPage() {
  const { total, lastSync } = await getStats();

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "1px", marginBottom: "28px" }}>
        Sync GitHub
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 200px)", gap: "3px", background: "#111", marginBottom: "32px", width: "fit-content" }}>
        <div style={{ background: "#fff", padding: "20px 24px" }}>
          <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
            Repos no banco
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "32px" }}>{total}</div>
        </div>
        <div style={{ background: "#fff", padding: "20px 24px" }}>
          <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
            Último sync
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", marginTop: "6px" }}>
            {lastSync
              ? new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(lastSync))
              : "Nunca"}
          </div>
        </div>
      </div>

      <SyncButton action={syncAction} />
    </div>
  );
}
