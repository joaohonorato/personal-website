"use client";

import { useEffect, useRef, useId } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "neutral" });

export function MermaidChart({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    mermaid.render(`mermaid-${id}`, chart).then(({ svg }) => {
      ref.current!.innerHTML = svg;
    });
  }, [chart, id]);

  return <div ref={ref} style={{ overflowX: "auto", margin: "24px 0" }} />;
}
