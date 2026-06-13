import { createPost } from "../actions";
import { PostForm } from "../PostForm";

export default function NewPostPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", letterSpacing: "1px", marginBottom: "28px" }}>
        Novo Post
      </h1>
      <PostForm action={createPost} />
    </div>
  );
}
