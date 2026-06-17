import type { Metadata } from "next";
import { Bangers, Special_Elite } from "next/font/google";
import "./globals.css";

const bangers = Bangers({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const specialElite = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-story",
});

export const metadata: Metadata = {
  title: "personal-blog",
  description: "Dev, IA, automação e projetos pessoais",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bangers.variable} ${specialElite.variable}`}>
      <body>{children}</body>
    </html>
  );
}
