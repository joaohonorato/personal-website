"use client";

import type { UserRole } from "./actions";

type Props = {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: { email?: string; role?: UserRole };
  isEdit?: boolean;
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

export default function UserForm({ action, defaultValues, isEdit }: Props) {
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "480px" }}>
      <div>
        <label style={labelStyle}>Email</label>
        <input
          name="email"
          type="email"
          required
          defaultValue={defaultValues?.email ?? ""}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>{isEdit ? "Nova senha (deixe em branco para manter)" : "Senha"}</label>
        <input
          name="password"
          type="password"
          required={!isEdit}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Role</label>
        <select
          name="role"
          defaultValue={defaultValues?.role ?? "READER"}
          style={{ ...inputStyle, background: "#fff", cursor: "pointer" }}
        >
          <option value="ADMIN">Admin — gerencia tudo</option>
          <option value="WRITER">Writer — gerencia posts</option>
          <option value="READER">Reader — somente leitura</option>
        </select>
      </div>

      <button
        type="submit"
        style={{
          background: "#111", color: "#F5F0E8", border: "none",
          padding: "12px", fontSize: "13px", fontWeight: 600,
          letterSpacing: "1px", cursor: "pointer", textTransform: "uppercase",
        }}
      >
        {isEdit ? "Salvar alterações" : "Criar usuário"}
      </button>
    </form>
  );
}