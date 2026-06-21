"use client";

import { useState, useRef } from "react";
import { useCyclingMessage } from "@/hooks/useCyclingMessage";

const AGENT_URL = "/api/agent";

const ADAPTING_MESSAGES = [
  "Lendo o artigo...",
  "Extraindo os insights principais...",
  "Adaptando o tom para LinkedIn...",
  "Formatando para engajamento máximo...",
  "Revisando o texto final...",
];

const ITERATING_MESSAGES = [
  "Processando seu feedback...",
  "Refinando o texto...",
  "Aplicando os ajustes...",
  "Quase pronto...",
];

const PUBLISHING_MESSAGES = [
  "Conectando ao LinkedIn...",
  "Publicando o post...",
  "Aguardando confirmação...",
];

type Phase =
  | "idle"
  | "adapting"
  | "awaiting_approval"
  | "iterating"
  | "publishing"
  | "published"
  | "error";

export function LinkedInPanel({ postId }: { postId: number }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [adaptedText, setAdaptedText] = useState("");
  const [editedText, setEditedText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const adaptingMessage = useCyclingMessage(ADAPTING_MESSAGES, 3000);
  const iteratingMessage = useCyclingMessage(ITERATING_MESSAGES, 2500);
  const publishingMessage = useCyclingMessage(PUBLISHING_MESSAGES, 2000);

  function listenStream(jobId: string) {
    const es = new EventSource(`${AGENT_URL}/linkedin/stream/${jobId}`);

    es.onmessage = (e) => {
      const event = JSON.parse(e.data);

      if (event.type === "adapting") {
        setPhase("adapting");
      } else if (event.type === "awaiting_linkedin_approval") {
        setAdaptedText(event.text ?? "");
        setEditedText(event.text ?? "");
        setPhase("awaiting_approval");
        es.close();
      } else if (event.type === "publishing_linkedin") {
        setPhase("publishing");
      } else if (event.type === "published") {
        setLinkedinUrl(event.linkedinUrl ?? null);
        setPhase("published");
        es.close();
      } else if (event.type === "error") {
        setError(event.message ?? "Unknown error");
        setPhase("error");
        es.close();
      }
    };

    es.onerror = () => {
      setError("Connection lost");
      setPhase("error");
      es.close();
    };
  }

  async function startAdapt() {
    setPhase("adapting");
    setError(null);
    setLinkedinUrl(null);

    const res = await fetch(`${AGENT_URL}/linkedin/adapt/${postId}`, { method: "POST" });
    if (!res.ok) {
      setError("Failed to start LinkedIn adaptation");
      setPhase("error");
      return;
    }
    const { jobId } = await res.json();
    jobIdRef.current = jobId;
    listenStream(jobId);
  }

  async function sendIteration() {
    const jobId = jobIdRef.current;
    if (!jobId || !feedback.trim()) return;
    setPhase("iterating");

    const res = await fetch(`${AGENT_URL}/linkedin/iterate/${jobId}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ feedback }),
    });
    if (!res.ok) {
      setError("Iteration failed");
      setPhase("error");
      return;
    }
    setFeedback("");
    listenStream(jobId);
  }

  async function approve() {
    const jobId = jobIdRef.current;
    if (!jobId) return;
    setPhase("publishing");

    const res = await fetch(`${AGENT_URL}/linkedin/approve/${jobId}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text: editedText }),
    });
    if (!res.ok) {
      setError("Approval failed");
      setPhase("error");
      return;
    }
    listenStream(jobId);
  }

  const panelStyle: React.CSSProperties = {
    border:       "2px solid var(--black)",
    marginBottom: "28px",
    background:   "var(--white)",
  };
  const headerStyle: React.CSSProperties = {
    background:    "#0077b5",
    color:         "#fff",
    fontSize:      "11px",
    fontWeight:    600,
    letterSpacing: "1px",
    textTransform: "uppercase",
    padding:       "5px 12px",
    borderBottom:  "2px solid var(--black)",
    display:       "flex",
    justifyContent: "space-between",
    alignItems:    "center",
  };
  const bodyStyle: React.CSSProperties = { padding: "16px" };
  const textareaStyle: React.CSSProperties = {
    width:      "100%",
    minHeight:  "140px",
    fontFamily: "var(--font-mono)",
    fontSize:   "13px",
    padding:    "10px",
    border:     "2px solid var(--black)",
    resize:     "vertical",
    boxSizing:  "border-box",
  };
  const btnStyle: React.CSSProperties = {
    background:  "var(--black)",
    color:       "var(--white)",
    border:      "none",
    padding:     "8px 18px",
    fontFamily:  "var(--font-display)",
    fontSize:    "12px",
    letterSpacing: "1px",
    cursor:      "pointer",
    textTransform: "uppercase",
  };
  const ghostBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: "transparent",
    color:      "var(--black)",
    border:     "2px solid var(--black)",
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>LinkedIn Publisher</span>
        {phase === "published" && linkedinUrl && (
          <a href={linkedinUrl} target="_blank" rel="noreferrer" style={{ color: "#fff", fontSize: "11px" }}>
            Ver post →
          </a>
        )}
      </div>

      <div style={bodyStyle}>
        {phase === "idle" && (
          <button style={btnStyle} onClick={startAdapt}>
            Adaptar para LinkedIn
          </button>
        )}

        {(phase === "adapting" || phase === "iterating") && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#666" }}>
            <LinkedInSpinner />
            <span
              key={phase === "adapting" ? adaptingMessage : iteratingMessage}
              style={{ fontFamily: "var(--font-mono)", fontSize: "13px", animation: "msgFadeIn 0.4s ease" }}
            >
              {phase === "adapting" ? adaptingMessage : iteratingMessage}
            </span>
            <style>{`@keyframes msgFadeIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          </div>
        )}

        {phase === "awaiting_approval" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
              Revise o texto abaixo antes de publicar. Você pode editar diretamente ou pedir uma iteração ao agente.
            </p>

            <textarea
              style={textareaStyle}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
            />

            <div style={{ display: "flex", gap: "8px" }}>
              <button style={btnStyle} onClick={approve}>
                Publicar no LinkedIn
              </button>
              <button style={ghostBtnStyle} onClick={startAdapt}>
                Gerar novamente
              </button>
            </div>

            <div style={{ borderTop: "1px solid #ddd", paddingTop: "12px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, margin: "0 0 6px" }}>
                Iterar com o agente
              </p>
              <textarea
                style={{ ...textareaStyle, minHeight: "60px" }}
                placeholder="Ex: Deixe mais conciso, adicione um dado estatístico, mude o tom para mais inspiracional..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <button
                style={{ ...ghostBtnStyle, marginTop: "8px" }}
                onClick={sendIteration}
                disabled={!feedback.trim()}
              >
                Enviar feedback
              </button>
            </div>
          </div>
        )}

        {phase === "publishing" && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#666" }}>
            <LinkedInSpinner />
            <span
              key={publishingMessage}
              style={{ fontFamily: "var(--font-mono)", fontSize: "13px", animation: "msgFadeIn 0.4s ease" }}
            >
              {publishingMessage}
            </span>
          </div>
        )}

        {phase === "published" && (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ color: "green", fontWeight: 600, fontSize: "14px" }}>✓ Publicado com sucesso</span>
            {linkedinUrl && (
              <a href={linkedinUrl} target="_blank" rel="noreferrer" style={{ fontSize: "12px" }}>
                Abrir no LinkedIn →
              </a>
            )}
            <button style={ghostBtnStyle} onClick={() => { setPhase("idle"); setLinkedinUrl(null); }}>
              Publicar outro
            </button>
          </div>
        )}

        {phase === "error" && (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ color: "red", fontSize: "13px" }}>{error}</span>
            <button style={ghostBtnStyle} onClick={() => setPhase("idle")}>
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LinkedInSpinner() {
  return (
    <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid #ccc", borderTopColor: "#0077b5", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
