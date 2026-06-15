import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, slug, excerpt, content, category, tags } = body;

    if (!title || !slug || !excerpt || !content || !category) {
      return NextResponse.json(
        { error: "Missing required fields: title, slug, excerpt, content, category" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        title,
        slug,
        excerpt,
        content,
        category,
        tags: tags ?? [],
        published: true,
        generated_by_agent: true,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/");

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/articles]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
