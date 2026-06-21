import json
import math
from pathlib import Path
from typing import Callable

import requests


def web_search(tavily_client, query: str, count: int = 5) -> str:
    response = tavily_client.search(query, max_results=count)
    results = response.get("results", [])
    return json.dumps(
        [{"title": r["title"], "url": r["url"], "content": r.get("content", "")} for r in results],
        ensure_ascii=False,
    )


def publish_article(
    *,
    blog_api_url: str,
    token: str,
    title: str,
    slug: str,
    excerpt: str,
    content: str,
    category: str,
    tags: list[str],
    reading_time_min: int,
    cover_image_url: str | None = None,
) -> dict:
    reading_time_min = max(1, math.ceil(len(content.split()) / 200))
    resp = requests.post(
        f"{blog_api_url}/api/posts",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={
            "title": title,
            "slug": slug,
            "excerpt": excerpt,
            "content": content,
            "category": category,
            "tags": tags,
            "coverImageUrl": cover_image_url,
            "readingTimeMin": reading_time_min,
            "published": False,
            "generatedByAgent": True,
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def save_draft(content: str, filename: str) -> str:
    drafts_dir = Path(__file__).parent.parent / "drafts"
    drafts_dir.mkdir(exist_ok=True)
    path = drafts_dir / filename
    path.write_text(content, encoding="utf-8")
    return str(path)


def make_cover_image_fn(
    openai_api_key: str,
    cloudinary_cloud_name: str,
    cloudinary_api_key: str,
    cloudinary_api_secret: str,
) -> Callable[[str], str]:
    import base64

    import cloudinary
    import cloudinary.uploader
    import openai

    cloudinary.config(
        cloud_name=cloudinary_cloud_name,
        api_key=cloudinary_api_key,
        api_secret=cloudinary_api_secret,
    )
    oa_client = openai.OpenAI(api_key=openai_api_key)

    def generate_cover_image(prompt: str) -> str:
        response = oa_client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1792x1024",
            quality="hd",
            n=1,
            response_format="b64_json",
        )
        image_bytes = base64.b64decode(response.data[0].b64_json)
        result = cloudinary.uploader.upload(image_bytes, folder="blog/covers", resource_type="image")
        return result["secure_url"]

    return generate_cover_image
