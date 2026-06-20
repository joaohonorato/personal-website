import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="navbar">
        <Link href="/" className="nav-logo" style={{ fontSize: "18px", letterSpacing: "1.5px" }}>Gabriel Honorato Pages</Link>
        <ul className="nav-links">
          <li><Link href="/blog">Blog</Link></li>
          <li><Link href="/projects">Projetos</Link></li>
          <li><Link href="/about">Sobre</Link></li>
        </ul>
      </nav>
      {children}
    </>
  );
}
