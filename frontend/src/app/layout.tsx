import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "personal-blog",
  description: "Dev, IA, automação e projetos pessoais",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bangers&family=Special+Elite&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
