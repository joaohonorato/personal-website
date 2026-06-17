"use client";

import { useFormStatus } from "react-dom";

type Props = {
  label: string;
  pendingLabel?: string;
};

export function SubmitButton({ label, pendingLabel }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        background: pending ? "#555" : "#111",
        color: "#F5F0E8",
        border: "none",
        padding: "10px 24px",
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "1px",
        cursor: pending ? "not-allowed" : "pointer",
        textTransform: "uppercase",
      }}
    >
      {pending ? (pendingLabel ?? "Salvando...") : label}
    </button>
  );
}
