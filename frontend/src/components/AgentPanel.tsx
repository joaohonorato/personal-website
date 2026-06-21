"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { redirectIfUnauthorized } from "@/lib/auth-redirect";

type Status = "idle" | "running" | "outline" | "writing" | "done" | "error";

type AgentEvent =
  | { type: "started" }
  | { type: "search"; query: string }
  | { type: "outline"; text: string }
  | { type: "writing" }
  | { type: "cover" }
  | { type: "publishing" }
  | { type: "post_created"; postId: number; slug: string; title: string }
  | { type: "done" }
  | { type: "error"; message: string }
  | { type: "cancelled" };

const btn: React.CSSProperties = {
  border: "2px solid #111",
  padding: "10px 20px",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "1px",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};

const inputStyle: React.CSSProperties = {
  border: "2px solid #111",
  padding: "8px 10px",
  fontSize: "13px",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
};

const label: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "5px",
};

export function AgentPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [outline, setOutline] = useState("");
  const [feedback, setFeedback] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [createdPost, setCreatedPost] = useState<{ postId: number; slug: string; title: string } | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Form
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("pt-BR");
  const [category, setCategory] = useState("Tech");
  const [audience, setAudience] = useState("software developers");
  const [keyPoints, setKeyPoints] = useState("");

  function addLog(msg: string) {
    setLogs((prev) => [...prev, msg]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;

    setStatus("running");
    setLogs([]);
    setCreatedPost(null);

    const res = await fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, language, category, audience, keyPoints }),
    });

    if (await redirectIfUnauthorized(res.status)) return;
    if (!res.ok) {
      setStatus("error");
      setLogs(["❌ Erro ao iniciar o agente. O servidor está rodando?"]);
      return;
    }

    const { jobId: id } = await res.json();
    setJobId(id);

    const es = new EventSource(`/api/agent/stream/${id}`);
    esRef.current = es;

    es.onmessage = (e) => {
      const event: AgentEvent = JSON.parse(e.data);

      switch (event.type) {
        case "started":
          addLog("⚡ Agente iniciado — pesquisando...");
          break;
        case "search":
          addLog(`🔍 Pesquisando "${event.query}"`);
          break;
        case "outline":
          setOutline(event.text);
          setStatus("outline");
          addLog("📋 Outline gerado — aguardando aprovação");
          break;
        case "writing":
          setStatus("writing");
          addLog("✍️  Escrevendo artigo completo...");
          break;
        case "cover":
          addLog("🎨 Gerando imagem de capa...");
          break;
        case "publishing":
          addLog("📤 Publicando rascunho na API...");
          break;
        case "post_created":
          setCreatedPost({ postId: event.postId, slug: event.slug, title: event.title });
          addLog(`✅ Rascunho criado: "${event.title}" (id ${event.postId})`);
          break;
        case "done":
          setStatus("done");
          es.close();
          break;
        case "error":
          setStatus("error");
          addLog(`❌ ${event.message}`);
          es.close();
          break;
        case "cancelled":
          setStatus("idle");
          setLogs([]);
          es.close();
          break;
      }
    };

    es.onerror = () => {
      if (status !== "done" && status !== "idle") {
        setStatus("error");
        addLog("❌ Conexão com o agente perdida");
      }
      es.close();
    };
  }

  async function handleApprove() {
    if (!jobId) return;
    await fetch(`/api/agent/approve/${jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback }),
    });
    setFeedback("");
    setStatus("writing");
    addLog(feedback.trim() ? `💬 Feedback enviado — revisando outline...` : "✅ Outline aprovado — escrevendo...");
  }

  async function handleCancel() {
    if (jobId) {
      await fetch(`/api/agent/cancel/${jobId}`, { method: "POST" });
    }
    esRef.current?.close();
    setStatus("idle");
    setLogs([]);
    setJobId(null);
  }

  function handleReset() {
    setStatus("idle");
    setLogs([]);
    setJobId(null);
    setOutline("");
    setCreatedPost(null);
  }

  return (
    <div style={{ border: "2px solid #111", marginBottom: "36px" }}>
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...btn,
          width: "100%",
          background: "#111",
          color: "#FFD700",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          fontSize: "13px",
        }}
      >
        <span>⚡ GERAR COM AGENTE</span>
        <span style={{ opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "20px" }}>
          {/* ── IDLE: formulário ── */}
          {status === "idle" && (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={label}>Tópico *</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  placeholder="ex: Arquitetura de microsserviços com Kotlin"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={label}>Idioma</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} style={inputStyle}>
                    <option value="pt-BR">pt-BR</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label style={label}>Categoria</label>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={label}>Audiência</label>
                  <input
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={label}>Pontos-chave (opcional)</label>
                <textarea
                  value={keyPoints}
                  onChange={(e) => setKeyPoints(e.target.value)}
                  rows={2}
                  placeholder="ex: focar em coroutines, comparar com Java, incluir exemplos de deploy"
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </div>

              <div>
                <button type="submit" style={{ ...btn, background: "#FFD700", color: "#111", border: "2px solid #111" }}>
                  ⚡ Gerar artigo
                </button>
              </div>
            </form>
          )}

          {/* ── RUNNING / WRITING: logs + cancel ── */}
          {(status === "running" || status === "writing") && (
            <div>
              <LogPanel logs={logs} />
              <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
                <Spinner />
                <span style={{ fontSize: "13px", color: "#555" }}>
                  {status === "running" ? "Pesquisando e gerando outline..." : "Escrevendo artigo completo..."}
                </span>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{ ...btn, marginLeft: "auto", background: "none", color: "#111" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ── OUTLINE: aprovação ── */}
          {status === "outline" && (
            <div>
              <LogPanel logs={logs} />
              <div style={{ margin: "16px 0 8px", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#FFD700", background: "#111", display: "inline-block", padding: "4px 10px" }}>
                Outline — aguardando aprovação
              </div>
              <pre style={{ background: "#fff", border: "2px solid #111", padding: "16px 20px", fontSize: "13px", lineHeight: "1.7", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "0 0 16px" }}>
                {outline}
              </pre>
              <div>
                <label style={label}>Feedback (deixe vazio para aprovar diretamente)</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={2}
                  placeholder="ex: adicione uma seção sobre testes de integração"
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{ ...btn, background: "none", color: "#111" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  style={{ ...btn, background: "#111", color: "#FFD700" }}
                >
                  {feedback.trim() ? "Enviar feedback" : "✓ Aprovar outline"}
                </button>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {status === "done" && (
            <div>
              <LogPanel logs={logs} />
              <div style={{ marginTop: "16px", padding: "16px 20px", background: "#fff", border: "2px solid #111" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", marginBottom: "8px" }}>
                  ✅ Artigo gerado com sucesso
                </div>
                {createdPost && (
                  <p style={{ fontSize: "13px", color: "#555", margin: "0 0 14px" }}>
                    <strong>{createdPost.title}</strong> — salvo como rascunho
                  </p>
                )}
                <div style={{ display: "flex", gap: "10px" }}>
                  {createdPost && (
                    <a
                      href={`/admin/posts/${createdPost.postId}/edit`}
                      style={{ ...btn, background: "#111", color: "#FFD700", textDecoration: "none", display: "inline-block" }}
                    >
                      → Abrir para editar
                    </a>
                  )}
                  <a
                    href="/admin/posts"
                    style={{ ...btn, background: "none", color: "#111", textDecoration: "none", display: "inline-block" }}
                  >
                    Ver todos os posts
                  </a>
                  <button type="button" onClick={handleReset} style={{ ...btn, background: "none", color: "#888", border: "2px solid #ccc" }}>
                    Gerar outro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {status === "error" && (
            <div>
              <LogPanel logs={logs} />
              <div style={{ marginTop: "12px", display: "flex", gap: "10px" }}>
                <button type="button" onClick={handleReset} style={{ ...btn, background: "none", color: "#111" }}>
                  Tentar novamente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LogPanel({ logs }: { logs: string[] }) {
  return (
    <div style={{ background: "#f8f8f8", border: "1px solid #ddd", padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", lineHeight: "1.8", maxHeight: "180px", overflowY: "auto" }}>
      {logs.length === 0
        ? <span style={{ color: "#aaa" }}>Iniciando...</span>
        : logs.map((l, i) => <div key={i}>{l}</div>)
      }
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid #ccc", borderTopColor: "#111", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
