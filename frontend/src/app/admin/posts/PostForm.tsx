"use client";

import { useRef, useState } from "react";

type DefaultValues = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  readingTimeMin: number;
  published: boolean;
  generatedByAgent: boolean;
};

type Props = {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Partial<DefaultValues>;
};

const inputStyle: React.CSSProperties = {
  border: "2px solid #111",
  padding: "10px 12px",
  fontSize: "14px",
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.5px",
  textTransform: "uppercase" as const,
  display: "block",
  marginBottom: "6px",
};

export function PostForm({ action, defaultValues }: Props) {
  const titleRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(defaultValues?.content ?? "");

  function handleTitleBlur() {
    if (slugRef.current && !slugRef.current.value && titleRef.current?.value) {
      slugRef.current.value = titleRef.current.value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
    }
  }

  function togglePreview() {
    if (!preview) {
      setPreviewHtml(contentRef.current?.value ?? "");
    }
    setPreview((p) => !p);
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "800px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <label style={labelStyle}>Título</label>
          <input
            ref={titleRef}
            name="title"
            required
            onBlur={handleTitleBlur}
            defaultValue={defaultValues?.title}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Slug</label>
          <input
            ref={slugRef}
            name="slug"
            defaultValue={defaultValues?.slug}
            placeholder="gerado automaticamente"
            style={{ ...inputStyle, color: "#555" }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: "16px" }}>
        <div>
          <label style={labelStyle}>Categoria</label>
          <input
            name="category"
            required
            defaultValue={defaultValues?.category}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Tags (separadas por vírgula)</label>
          <input
            name="tags"
            defaultValue={defaultValues?.tags?.join(", ")}
            placeholder="Next.js, TypeScript, IA"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Leitura (min)</label>
          <input
            name="reading_time_min"
            type="number"
            min={1}
            defaultValue={defaultValues?.readingTimeMin ?? 1}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Resumo</label>
        <textarea
          name="excerpt"
          required
          rows={2}
          defaultValue={defaultValues?.excerpt}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Conteúdo (HTML)</label>
          <button
            type="button"
            onClick={togglePreview}
            style={{
              background: preview ? "#111" : "none",
              color: preview ? "#F5F0E8" : "#111",
              border: "2px solid #111",
              padding: "4px 14px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            {preview ? "← Editar" : "Pré-visualizar"}
          </button>
        </div>

        {preview ? (
          <div
            style={{
              border: "2px solid #111",
              padding: "24px 28px",
              minHeight: "260px",
              background: "#fff",
              fontFamily: "var(--font-body, Georgia, serif)",
              fontSize: "16px",
              lineHeight: "1.8",
              color: "#222",
            }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <textarea
            ref={contentRef}
            name="content"
            required
            rows={16}
            defaultValue={defaultValues?.content}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: "13px" }}
          />
        )}
      </div>

      <div style={{ display: "flex", gap: "24px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
          <input
            type="checkbox"
            name="published"
            defaultChecked={defaultValues?.published ?? true}
          />
          Publicado
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
          <input
            type="checkbox"
            name="generated_by_agent"
            defaultChecked={defaultValues?.generatedByAgent ?? false}
          />
          Gerado por agente
        </label>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="submit"
          style={{ background: "#111", color: "#F5F0E8", border: "none", padding: "10px 24px", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", cursor: "pointer", textTransform: "uppercase" }}
        >
          Salvar
        </button>
        <a
          href="/admin/posts"
          style={{ border: "2px solid #111", padding: "10px 24px", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", textDecoration: "none", color: "#111", textTransform: "uppercase" }}
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
