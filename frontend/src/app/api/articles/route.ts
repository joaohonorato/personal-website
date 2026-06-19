import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8080";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, slug, excerpt, content, category, tags, coverImageUrl } = body;

    if (!title || !slug || !excerpt || !content || !category) {
      return NextResponse.json(
        { error: "Missing required fields: title, slug, excerpt, content, category" },
        { status: 400 }
      );
    }

    const wordCount = content.split(/\s+/).length;
    const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

    const res = await fetch(`${API_URL}/api/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ADMIN_SECRET}`,
      },
      body: JSON.stringify({
        title, slug, excerpt, content, category,
        tags: tags ?? [],
        published: true,
        generatedByAgent: true,
        coverImageUrl: coverImageUrl ?? null,
        readingTimeMin,
      }),
    });

    if (!res.ok) throw new Error(`Spring Boot API error: ${res.status}`);

    const post = await res.json();

    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/");

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/articles]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}