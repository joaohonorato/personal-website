import { useEffect, useState } from "react";

export function useCyclingMessage(messages: string[], intervalMs = 3500): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    const id = setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [messages, intervalMs]);

  return messages[index];
}
