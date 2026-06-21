"use client";

import { useState, useTransition } from "react";
import { useCyclingMessage } from "@/hooks/useCyclingMessage";
import { redirectIfUnauthorized } from "@/lib/auth-redirect";
import { applyReviewChanges } from "@/app/admin/posts/actions";
import { useRouter } from "next/navigation";

type ScoreBreakdown = {
  citations: number;
  sources: number;
  textQuality: number;
  coherence: number;
  cohesion: number;
};

type Suggestion = {
  id: string;
  type: "citation" | "grammar" | "clarity" | "structure" | "coherence" | "style";
  location: string;
  original: string;
  suggestion: string;
  reason: string;
  priority: "high" | "medium" | "low";
  improvesDimension?: keyof ScoreBreakdown;
};

type Review = {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  summary: string;
  suggestions: Suggestion[];
};

type PostData = {
  title: string; slug: string; excerpt: string; content: string;
  category: string; tags: string[]; readingTimeMin: number;
  published: boolean; generatedByAgent: boolean;
};

type ReviewResult = { post: PostData; review: Review };

const DIMENSION_LABELS: Record<keyof ScoreBreakdown, string> = {
  citations:   "Citações",
  sources:     "Fontes",
  textQuality: "Qualidade do texto",
  coherence:   "Coerência",
  cohesion:    "Coesão",
};

const TYPE_LABELS: Record<Suggestion["type"], string> = {
  citation:  "Citação",
  grammar:   "Gramática",
  clarity:   "Clareza",
  structure: "Estrutura",
  coherence: "Coerência",
  style:     "Estilo",
};

const PRIORITY_COLOR: Record<Suggestion["priority"], string> = {
  high:   "#e53e3e",
  medium: "#d97706",
  low:    "#4a9079",
};

function ScoreBar({ value }: { value: number }) {
  const pct = (value / 10) * 100;
  const color = value >= 8 ? "#4a9079" : value >= 6 ? "#d97706" : "#e53e3e";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ flex: 1, height: "6px", background: "#e5e5e5", borderRadius: 0 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontFamily: "var(--font-display)", fontSize: "14px", minWidth: "32px", textAlign: "right" }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

const REVIEW_MESSAGES = [
  "Lendo o artigo com atenção...",
  "Verificando qualidade do texto...",
  "Avaliando coerência e coesão...",
  "Cruzando referências e fontes...",
  "Identificando pontos de melhoria...",
  "Organizando sugestões por impacto...",
  "Calculando pontuação final...",
  "Quase pronto...",
];

export function ReviewPanel({ postId }: { postId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const loadingMessage = useCyclingMessage(REVIEW_MESSAGES, 4000);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const [isApplying, setIsApplying] = useState(false);

  async function handleReview(prevScore?: number) {
    if (prevScore !== undefined) setPreviousScore(prevScore);
    setStatus("loading");
    setResult(null);
    setApproved(new Set());
    try {
      const res = await fetch(`/api/agent/review/${postId}`, { method: "POST" });
      if (await redirectIfUnauthorized(res.status)) return;
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data: ReviewResult = await res.json();
      setResult(data);
      const highPriority = new Set(
        data.review.suggestions.filter((s) => s.priority === "high").map((s) => s.id)
      );
      setApproved(highPriority);
      setStatus("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
      setStatus("error");
    }
  }

  function toggleApproval(id: string) {
    setApproved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function applyTextSuggestions(content: string, suggestions: Suggestion[]): string {
    let updated = content;
    for (const s of suggestions) {
      if (approved.has(s.id)) {
        updated = updated.replace(s.original, s.suggestion);
      }
    }
    return updated;
  }

  async function handleApply() {
    if (!result || approved.size === 0) return;
    const newContent = applyTextSuggestions(result.post.content, result.review.suggestions);
    const scoreBeforeApply = result.review.score;
    setIsApplying(true);
    try {
      await applyReviewChanges(postId, result.post, newContent);
      startTransition(() => router.refresh());
      await handleReview(scoreBeforeApply);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao aplicar");
      setStatus("error");
    } finally {
      setIsApplying(false);
    }
  }

  const review = result?.review;

  return (
    <div style={{ border: "2px solid #111", marginBottom: "36px" }}>
      {/* Toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "#111",
          color: "#F5F0E8",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "1px",
          textTransform: "uppercase",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span>🔍 Revisar com IA</span>
        <span style={{ opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "20px" }}>
          {/* ── IDLE ── */}
          {status === "idle" && (
            <div>
              <p style={{ fontSize: "13px", color: "#555", marginBottom: "16px" }}>
                O agente vai analisar citações, fontes, qualidade do texto, coerência e coesão — e propor ajustes individuais que você pode aprovar ou rejeitar.
              </p>
              <button
                type="button"
                onClick={() => handleReview()}
                style={{ border: "2px solid #111", background: "#fff", padding: "10px 20px", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}
              >
                🔍 Iniciar revisão
              </button>
            </div>
          )}

          {/* ── LOADING ── */}
          {status === "loading" && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#555", fontSize: "13px" }}>
              <Spinner />
              <span key={loadingMessage} style={{ animation: "msgFadeIn 0.4s ease" }}>
                {loadingMessage}
              </span>
              <style>{`@keyframes msgFadeIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            </div>
          )}

          {/* ── ERROR ── */}
          {status === "error" && (
            <div>
              <p style={{ color: "#e53e3e", fontSize: "13px", marginBottom: "12px" }}>❌ {error}</p>
              <button type="button" onClick={() => setStatus("idle")} style={{ border: "2px solid #111", background: "none", padding: "8px 16px", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>
                Tentar novamente
              </button>
            </div>
          )}

          {/* ── RESULT ── */}
          {status === "done" && review && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Score card */}
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "20px", alignItems: "start" }}>
                <div style={{ textAlign: "center", border: "2px solid #111", padding: "16px 8px" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "42px", lineHeight: 1 }}>
                    {review.score.toFixed(1)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginTop: "4px" }}>
                    / 10
                  </div>
                  {previousScore !== null && (
                    <div style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      marginTop: "6px",
                      color: review.score > previousScore ? "#4a9079" : review.score < previousScore ? "#e53e3e" : "#888",
                    }}>
                      {review.score > previousScore ? "▲" : review.score < previousScore ? "▼" : "="}{" "}
                      {Math.abs(review.score - previousScore).toFixed(1)}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(Object.entries(review.scoreBreakdown) as [keyof ScoreBreakdown, number][]).map(([key, val]) => (
                    <div key={key}>
                      <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
                        {DIMENSION_LABELS[key]}
                      </div>
                      <ScoreBar value={val} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <p style={{ fontSize: "14px", lineHeight: "1.7", color: "#333", borderLeft: "3px solid #FFD700", paddingLeft: "14px", margin: 0 }}>
                {review.summary}
              </p>

              {/* Suggestions */}
              {review.suggestions.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>
                    {review.suggestions.length} sugestão(ões) — {approved.size} selecionada(s)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {review.suggestions.map((s) => {
                      const isApproved = approved.has(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleApproval(s.id)}
                          style={{
                            border: `2px solid ${isApproved ? "#111" : "#ddd"}`,
                            padding: "14px 16px",
                            cursor: "pointer",
                            background: isApproved ? "#fffbea" : "#fff",
                            transition: "border-color 0.15s, background 0.15s",
                          }}
                        >
                          {/* Header row */}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                            <input
                              type="checkbox"
                              checked={isApproved}
                              onChange={() => toggleApproval(s.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ width: "16px", height: "16px", cursor: "pointer" }}
                            />
                            <span style={{ fontSize: "11px", background: "#111", color: "#F5F0E8", padding: "2px 8px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                              {TYPE_LABELS[s.type]}
                            </span>
                            <span style={{ fontSize: "11px", color: PRIORITY_COLOR[s.priority], fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              {s.priority === "high" ? "Alta" : s.priority === "medium" ? "Média" : "Baixa"}
                            </span>
                            <span style={{ fontSize: "11px", color: "#aaa", marginLeft: "auto" }}>
                              {s.location}
                            </span>
                          </div>

                          {/* Before / After */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
                            <div>
                              <div style={{ fontSize: "10px", color: "#e53e3e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Antes</div>
                              <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", padding: "8px 10px", lineHeight: "1.6", fontFamily: "monospace" }}>
                                {s.original}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: "10px", color: "#4a9079", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Depois</div>
                              <div style={{ background: "#f0fff4", border: "1px solid #c6f6d5", padding: "8px 10px", lineHeight: "1.6", fontFamily: "monospace" }}>
                                {s.suggestion}
                              </div>
                            </div>
                          </div>

                          {/* Reason */}
                          <div style={{ marginTop: "8px", fontSize: "12px", color: "#555", fontStyle: "italic" }}>
                            {s.reason}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "10px", marginTop: "16px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={approved.size === 0 || isApplying}
                      style={{
                        border: "2px solid #111",
                        background: approved.size === 0 || isApplying ? "#eee" : "#111",
                        color: approved.size === 0 || isApplying ? "#999" : "#FFD700",
                        padding: "10px 20px",
                        fontSize: "12px",
                        fontWeight: 700,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        cursor: approved.size === 0 || isApplying ? "not-allowed" : "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {isApplying ? "Aplicando e reavaliando..." : `Aplicar ${approved.size} selecionado(s)`}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview()}
                      disabled={isApplying}
                      style={{ border: "2px solid #111", background: "none", padding: "10px 20px", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", cursor: isApplying ? "not-allowed" : "pointer", fontFamily: "inherit", color: "#555" }}
                    >
                      Reanalisar
                    </button>
                  </div>
                </div>
              )}

              {review.suggestions.length === 0 && (
                <p style={{ fontSize: "13px", color: "#4a9079", fontWeight: 700 }}>
                  ✅ Nenhuma sugestão de melhoria — artigo está em ótimo estado.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid #ccc", borderTopColor: "#111", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
