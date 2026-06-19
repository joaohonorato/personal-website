"use client";

import type { UserRole } from "@/types";
import { SubmitButton } from "@/app/admin/components/SubmitButton";

type Props = {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: { email?: string; roles?: UserRole[] };
  isEdit?: boolean;
};

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "ADMIN",   label: "Admin",    description: "Gerencia tudo" },
  { value: "WRITER",  label: "Writer",   description: "Gerencia posts" },
  { value: "READER",  label: "Reader",   description: "Somente leitura" },
  { value: "AI_USER", label: "AI User",  description: "Usa o agente de IA" },
];

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
  const defaultRoles = defaultValues?.roles ?? ["READER"];

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
        <label style={labelStyle}>Roles</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {ROLES.map((r) => (
            <label
              key={r.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                border: "2px solid #ddd",
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              <input
                type="checkbox"
                name="roles"
                value={r.value}
                defaultChecked={defaultRoles.includes(r.value)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <span style={{ fontWeight: 700, minWidth: "80px" }}>{r.label}</span>
              <span style={{ fontSize: "12px", color: "#888" }}>{r.description}</span>
            </label>
          ))}
        </div>
      </div>

      <SubmitButton label={isEdit ? "Salvar alterações" : "Criar usuário"} />
    </form>
  );
}
