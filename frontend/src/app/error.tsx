"use client";

import Link from "next/link";

function SpidermanSvg() {
  return (
    <svg
      viewBox="0 0 420 340"
      width="420"
      height="340"
      xmlns="http://www.w3.org/2000/svg"
      style={{ maxWidth: "100%", height: "auto" }}
      aria-hidden="true"
    >
      {/* Arc where he SHOULD be swinging — dotted and faded */}
      <path
        d="M 30 318 Q 210 48 390 318"
        fill="none"
        stroke="#111"
        strokeWidth="2"
        strokeDasharray="12,8"
        opacity="0.18"
      />

      {/* Ground */}
      <line x1="20" y1="318" x2="400" y2="318" stroke="#111" strokeWidth="3" />

      {/* ── LEGS (sitting, splayed out) ── */}
      <path d="M 183 262 Q 138 288 98 318" fill="none" stroke="#1E3A8C" strokeWidth="24" strokeLinecap="round" />
      <path d="M 237 262 Q 282 288 322 318" fill="none" stroke="#1E3A8C" strokeWidth="24" strokeLinecap="round" />

      {/* ── TORSO ── */}
      <ellipse cx="210" cy="236" rx="43" ry="38" fill="#DC2626" stroke="#111" strokeWidth="3" />

      {/* Spider on chest */}
      <ellipse cx="210" cy="238" rx="10" ry="6" fill="#111" />
      <line x1="200" y1="235" x2="187" y2="229" stroke="#111" strokeWidth="2" />
      <line x1="200" y1="242" x2="187" y2="248" stroke="#111" strokeWidth="2" />
      <line x1="220" y1="235" x2="233" y2="229" stroke="#111" strokeWidth="2" />
      <line x1="220" y1="242" x2="233" y2="248" stroke="#111" strokeWidth="2" />

      {/* ── LEFT ARM — hand on chin, confused ── */}
      <path d="M 172 222 L 140 250 L 126 280" fill="none" stroke="#1E3A8C" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />

      {/* ── RIGHT ARM — raised, pointing web shooter ── */}
      <path d="M 248 222 L 296 200 L 332 184" fill="none" stroke="#1E3A8C" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />

      {/* Web shooter device on wrist */}
      <rect x="326" y="178" width="20" height="11" rx="3" fill="#333" stroke="#111" strokeWidth="1.5" />

      {/* ── THE DROOPY WEB — sad, limp, useless ── */}
      <path
        d="M 340 188 C 362 205 358 248 348 274 C 341 294 344 308 344 318"
        fill="none"
        stroke="#111"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Drop at the end */}
      <ellipse cx="344" cy="322" rx="4" ry="5.5" fill="#111" />

      {/* ── HEAD ── */}
      <circle cx="210" cy="170" r="46" fill="#DC2626" stroke="#111" strokeWidth="3" />

      {/* Web pattern on mask */}
      <line x1="210" y1="125" x2="210" y2="215" stroke="#111" strokeWidth="1.2" opacity="0.4" />
      <line x1="210" y1="125" x2="172" y2="150" stroke="#111" strokeWidth="1" opacity="0.3" />
      <line x1="210" y1="125" x2="248" y2="150" stroke="#111" strokeWidth="1" opacity="0.3" />
      <line x1="210" y1="125" x2="160" y2="168" stroke="#111" strokeWidth="1" opacity="0.25" />
      <line x1="210" y1="125" x2="260" y2="168" stroke="#111" strokeWidth="1" opacity="0.25" />
      <path d="M 167 152 Q 210 147 253 152" fill="none" stroke="#111" strokeWidth="1" opacity="0.35" />
      <path d="M 165 167 Q 210 162 255 167" fill="none" stroke="#111" strokeWidth="1" opacity="0.35" />
      <path d="M 166 182 Q 210 177 254 182" fill="none" stroke="#111" strokeWidth="1" opacity="0.35" />
      <path d="M 170 197 Q 210 192 250 197" fill="none" stroke="#111" strokeWidth="1" opacity="0.3" />

      {/* Eyes */}
      <ellipse cx="191" cy="163" rx="17" ry="11" fill="white" stroke="#111" strokeWidth="2" transform="rotate(-22, 191, 163)" />
      <ellipse cx="229" cy="163" rx="17" ry="11" fill="white" stroke="#111" strokeWidth="2" transform="rotate(22, 229, 163)" />

      {/* Question marks above the head */}
      <text x="262" y="142" fontSize="30" fontWeight="900" fontFamily="Arial, sans-serif" fill="#111" opacity="0.7">?</text>
      <text x="288" y="115" fontSize="20" fontWeight="900" fontFamily="Arial, sans-serif" fill="#111" opacity="0.45">?</text>
    </svg>
  );
}

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F0E8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        fontFamily: "inherit",
      }}
    >
      <SpidermanSvg />

      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display, 'Bangers', sans-serif)",
            fontSize: "clamp(60px, 12vw, 96px)",
            letterSpacing: "5px",
            color: "#111",
            margin: "12px 0 2px",
            lineHeight: 1,
          }}
        >
          ERRO
        </h1>

        <p
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#888",
            marginBottom: "16px",
          }}
        >
          Teia fora do ar
        </p>

        <p
          style={{
            fontSize: "15px",
            color: "#555",
            lineHeight: 1.7,
            marginBottom: "36px",
          }}
        >
          Algo inesperado aconteceu. O Homem-Aranha tentou consertar, mas a teia simplesmente não cooperou.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={reset}
            style={{
              background: "#111",
              color: "#F5F0E8",
              border: "none",
              padding: "12px 28px",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Tentar novamente
          </button>

          <Link
            href="/"
            style={{
              background: "none",
              color: "#111",
              border: "3px solid #111",
              padding: "12px 28px",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              textDecoration: "none",
              textTransform: "uppercase",
              display: "inline-block",
            }}
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}