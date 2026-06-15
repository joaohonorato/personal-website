"use client";

import { useActionState } from "react";

type State = { synced: number; error?: string } | null;

export function SyncButton({
  action,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
}) {
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <form action={formAction}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            background: isPending ? "#555" : "#111",
            color: "#F5F0E8",
            border: "none",
            padding: "12px 28px",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "1px",
            cursor: isPending ? "not-allowed" : "pointer",
            textTransform: "uppercase",
          }}
        >
          {isPending ? "Sincronizando..." : "Sincronizar agora"}
        </button>
      </form>

      {state && !state.error && (
        <div style={{ border: "2px solid #111", padding: "14px 18px", background: "#fff", display: "inline-block" }}>
          <span style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Resultado
          </span>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "20px", margin: "4px 0 0" }}>
            {state.synced} repos sincronizados
          </p>
        </div>
      )}

      {state?.error && (
        <div style={{ border: "2px solid #c00", padding: "14px 18px", background: "#fff2f2" }}>
          <span style={{ fontSize: "12px", color: "#c00" }}>Erro: {state.error}</span>
        </div>
      )}
    </div>
  );
}
