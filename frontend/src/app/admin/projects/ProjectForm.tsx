type Repo = { id: number; name: string; fullName: string; isPrivate: boolean };
type Post = { id: number; title: string; slug: string };

type Props = {
  action: (formData: FormData) => Promise<void>;
  repos: Repo[];
  posts: Post[];
  defaultValues?: {
    name: string;
    description: string;
    repoIds: number[];
    postIds: number[];
  };
};

export function ProjectForm({ action, repos, posts, defaultValues }: Props) {
  const selectedRepos = new Set(defaultValues?.repoIds ?? []);
  const selectedPosts = new Set(defaultValues?.postIds ?? []);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "720px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
          Nome
        </label>
        <input
          name="name"
          required
          defaultValue={defaultValues?.name}
          style={{ border: "2px solid #111", padding: "10px 12px", fontSize: "14px", outline: "none", fontFamily: "inherit" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
          Descrição / Propósito
        </label>
        <textarea
          name="description"
          required
          rows={3}
          defaultValue={defaultValues?.description}
          style={{ border: "2px solid #111", padding: "10px 12px", fontSize: "14px", outline: "none", fontFamily: "inherit", resize: "vertical" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
          Repositórios ({repos.length} disponíveis)
        </label>
        <div style={{ border: "2px solid #111", maxHeight: "220px", overflowY: "auto" }}>
          {repos.length === 0 ? (
            <p style={{ padding: "12px", fontSize: "13px", color: "#888", margin: 0 }}>
              Nenhum repo sincronizado ainda. Vá em Sync GitHub primeiro.
            </p>
          ) : (
            repos.map((repo) => (
              <label
                key={repo.id}
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderBottom: "1px solid #11111215", cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  name="repo_ids"
                  value={repo.id}
                  defaultChecked={selectedRepos.has(repo.id)}
                />
                <span style={{ fontSize: "13px", flex: 1 }}>{repo.fullName}</span>
                {repo.isPrivate && (
                  <span style={{ fontSize: "10px", color: "#888", border: "1px solid #ccc", padding: "1px 6px" }}>privado</span>
                )}
              </label>
            ))
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
          Artigos relacionados ({posts.length} disponíveis)
        </label>
        <div style={{ border: "2px solid #111", maxHeight: "220px", overflowY: "auto" }}>
          {posts.length === 0 ? (
            <p style={{ padding: "12px", fontSize: "13px", color: "#888", margin: 0 }}>Nenhum artigo publicado.</p>
          ) : (
            posts.map((post) => (
              <label
                key={post.id}
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderBottom: "1px solid #11111215", cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  name="post_ids"
                  value={post.id}
                  defaultChecked={selectedPosts.has(post.id)}
                />
                <span style={{ fontSize: "13px" }}>{post.title}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="submit"
          style={{ background: "#111", color: "#F5F0E8", border: "none", padding: "10px 24px", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", cursor: "pointer", textTransform: "uppercase" }}
        >
          Salvar
        </button>
        <a
          href="/admin/projects"
          style={{ border: "2px solid #111", padding: "10px 24px", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", textDecoration: "none", color: "#111", textTransform: "uppercase" }}
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
