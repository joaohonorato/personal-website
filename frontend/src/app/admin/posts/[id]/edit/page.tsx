import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { updatePost } from "../../actions";
import { PostForm } from "../../PostForm";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const post = await apiFetch<{
    id: number; title: string; slug: string; excerpt: string; content: string;
    category: string; tags: string[]; readingTimeMin: number; published: boolean; generatedByAgent: boolean;
  }>(`/api/posts/id/${id}`, {}, true).catch(() => null);

  if (!post) notFound();

  const action = updatePost.bind(null, Number(id));

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "1px", marginBottom: "28px" }}>
        Editar — {post.title}
      </h1>
      <PostForm
        action={action}
        defaultValues={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          category: post.category,
          tags: post.tags ?? [],
          readingTimeMin: post.readingTimeMin,
          published: post.published,
          generatedByAgent: post.generatedByAgent,
        }}
      />
    </div>
  );
}