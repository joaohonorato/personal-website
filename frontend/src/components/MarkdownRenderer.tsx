"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { MermaidChart } from "./MermaidChart";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }) {
            const lang = /language-(\w+)/.exec(className ?? "")?.[1];
            const raw = String(children).replace(/\n$/, "");
            const isBlock = !!className;

            if (lang === "mermaid") {
              return <MermaidChart chart={raw} />;
            }

            if (isBlock) {
              return (
                <SyntaxHighlighter
                  language={lang ?? "text"}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: "20px 0",
                    border: "2px solid #111",
                    borderRadius: 0,
                    fontSize: "13px",
                    lineHeight: "1.6",
                  }}
                  showLineNumbers
                >
                  {raw}
                </SyntaxHighlighter>
              );
            }

            return (
              <code
                style={{
                  background: "#f0f0f0",
                  border: "1px solid #ddd",
                  borderRadius: "3px",
                  padding: "2px 6px",
                  fontSize: "0.88em",
                  fontFamily: "monospace",
                }}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
