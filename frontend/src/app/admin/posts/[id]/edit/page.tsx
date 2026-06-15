import { notFound } from "next/navigation";
import { createServiceClient } from "@/utils/supabase/service";
import { updatePost } from "../../actions";
import { PostForm } from "../../PostForm";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

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
          readingTimeMin: post.reading_time_min,
          published: post.published,
          generatedByAgent: post.generated_by_agent,
        }}
      />
    </div>
  );
}
