import Link from "next/link";

export default function ProjectsPage() {
  return (
    <>
      <nav className="navbar">
        <Link href="/" className="nav-logo">personal-blog</Link>
        <ul className="nav-links">
          <li><Link href="/blog">Blog</Link></li>
          <li><Link href="/projects">Projetos</Link></li>
          <li><Link href="/about">Sobre</Link></li>
        </ul>
      </nav>
      <div className="container">
        <div className="section-header">
          <span className="section-label">Projetos</span>
          <div className="section-line" />
        </div>
        <p style={{ color: "#888", fontSize: "14px" }}>Em breve.</p>
      </div>
    </>
  );
}
