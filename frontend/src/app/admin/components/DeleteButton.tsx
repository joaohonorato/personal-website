"use client";

import { useTransition } from "react";

type Props = {
  action: () => Promise<void>;
  confirmMessage?: string;
};

export function DeleteButton({ action, confirmMessage = "Tem certeza que deseja excluir?" }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(confirmMessage)) return;
    startTransition(async () => {
      await action();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      style={{
        border: "2px solid #c00",
        padding: "6px 14px",
        fontSize: "12px",
        fontWeight: 600,
        background: "none",
        color: isPending ? "#aaa" : "#c00",
        cursor: isPending ? "not-allowed" : "pointer",
        borderColor: isPending ? "#aaa" : "#c00",
      }}
    >
      {isPending ? "Excluindo..." : "Excluir"}
    </button>
  );
}
