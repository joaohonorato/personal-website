#!/usr/bin/env python3
"""
Article generation agent for personal blog.

Phases:
  1. Research   — web search via Tavily
  2. Outline    — structure proposal, awaits human approval
  3. Write      — full Markdown article with Mermaid diagrams
  4. Cover      — DALL-E 3 + Cloudinary (optional, skipped if OPENAI_API_KEY not set)
  5. Publish    — POST to blog API as unpublished draft
"""

import json
import math
import os
import sys
from pathlib import Path

import anthropic
import requests
from dotenv import load_dotenv
from tavily import TavilyClient

load_dotenv(Path(__file__).parent / ".env")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
TAVILY_API_KEY    = os.environ["TAVILY_API_KEY"]
BLOG_API_URL      = os.environ.get("BLOG_API_URL", "http://localhost:8080")

OPENAI_API_KEY          = os.environ.get("OPENAI_API_KEY", "")
CLOUDINARY_CLOUD_NAME   = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY      = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET   = os.environ.get("CLOUDINARY_API_SECRET", "")

COVER_IMAGE_ENABLED = bool(OPENAI_API_KEY and CLOUDINARY_CLOUD_NAME)

anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
tavily_client    = TavilyClient(api_key=TAVILY_API_KEY)


def get_blog_token() -> str:
    """Obtém JWT da blog API. Prioridade: token fixo → env email/senha → prompt interativo."""
    import getpass

    if token := os.environ.get("BLOG_ADMIN_TOKEN", ""):
        return token

    email    = os.environ.get("BLOG_EMAIL", "") or input("  Blog email: ").strip()
    password = os.environ.get("BLOG_PASSWORD", "") or getpass.getpass("  Blog senha: ")

    resp = requests.post(
        f"{BLOG_API_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=10,
    )
    if not resp.ok:
        print(f"\n  Erro ao autenticar na blog API: {resp.status_code} {resp.text}")
        sys.exit(1)

    print("  Autenticado.\n")
    return resp.json()["token"]


# Token resolvido em runtime (ver main)
BLOG_ADMIN_TOKEN: str = ""

if COVER_IMAGE_ENABLED:
    import base64
    import cloudinary
    import cloudinary.uploader
    import openai

    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
    )
    openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)

# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def web_search(query: str, count: int = 5) -> str:
    response = tavily_client.search(query, max_results=count)
    results = response.get("results", [])
    return json.dumps(
        [{"title": r["title"], "url": r["url"], "content": r.get("content", "")} for r in results],
        ensure_ascii=False,
    )


def generate_cover_image(prompt: str) -> str:
    if not COVER_IMAGE_ENABLED:
        return "Cover image generation is disabled (OPENAI_API_KEY not set)."

    response = openai_client.images.generate(
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


def publish_article(
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
        f"{BLOG_API_URL}/api/posts",
        headers={
            "Authorization": f"Bearer {BLOG_ADMIN_TOKEN}",
            "Content-Type": "application/json",
        },
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
    drafts_dir = Path(__file__).parent / "drafts"
    drafts_dir.mkdir(exist_ok=True)
    path = drafts_dir / filename
    path.write_text(content, encoding="utf-8")
    return str(path)


# ---------------------------------------------------------------------------
# Tool schema (cover image tool added only when enabled)
# ---------------------------------------------------------------------------

TOOLS: list[dict] = [
    {
        "name": "web_search",
        "description": (
            "Search the web for information. Call 3-5 times with different targeted queries "
            "to build a comprehensive research base for the article."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "count": {"type": "integer", "description": "Number of results (1-10)", "default": 5},
            },
            "required": ["query"],
        },
    },
    {
        "name": "publish_article",
        "description": (
            "Publish the finished article to the blog as an unpublished draft. "
            "The author will review and publish manually."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title":            {"type": "string"},
                "slug":             {"type": "string", "description": "URL slug (lowercase, hyphens only)"},
                "excerpt":          {"type": "string", "description": "1-2 sentence summary for article cards"},
                "content":          {"type": "string", "description": "Full article in Markdown with Mermaid blocks"},
                "category":         {"type": "string"},
                "tags":             {"type": "array", "items": {"type": "string"}},
                "reading_time_min": {"type": "integer"},
                "cover_image_url":  {"type": "string", "description": "Image URL (optional)"},
            },
            "required": ["title", "slug", "excerpt", "content", "category", "tags", "reading_time_min"],
        },
    },
    {
        "name": "save_draft",
        "description": "Save a local Markdown draft to agent/drafts/.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content":  {"type": "string"},
                "filename": {"type": "string", "description": "e.g. 'draft-kubernetes-intro.md'"},
            },
            "required": ["content", "filename"],
        },
    },
]

if COVER_IMAGE_ENABLED:
    TOOLS.insert(2, {
        "name": "generate_cover_image",
        "description": (
            "Generate a professional cover image using DALL-E 3 and upload to Cloudinary. "
            "Returns the public image URL."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": (
                        "DALL-E 3 prompt. Style: 'minimalist tech illustration, flat design, "
                        "dark background, professional blog cover, [topic elements]'"
                    ),
                },
            },
            "required": ["prompt"],
        },
    })

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

_cover_phase = (
    """### Phase 4 — Cover Image
Call generate_cover_image with a descriptive prompt.
Style: "minimalist tech illustration, flat design, dark background, professional blog cover"
"""
    if COVER_IMAGE_ENABLED
    else "### Phase 4 — Cover Image\nSkip this phase (image generation not configured).\n"
)

SYSTEM_PROMPT = f"""You are an expert technical writer creating high-quality blog articles.

## Workflow — follow these phases in order

### Phase 1 — Research
Call web_search 3-5 times with distinct, targeted queries.
Synthesize findings into a research summary before moving on.

### Phase 2 — Outline
Present the outline in this exact format:

```
OUTLINE:
# [Title]
Estimated reading time: X min

## [Section 1]
## [Section 2]
...
## Conclusion
```

End your message with the single token: AWAITING_OUTLINE_APPROVAL
Do not write anything after that token. Stop and wait.

### Phase 3 — Write
Write the complete article in Markdown.
- Use ## and ### for headings
- Use ```mermaid blocks for architecture diagrams, flows, and sequences
- Use language-tagged ``` blocks for code samples
- Aim for depth: each section should be substantial, not superficial

{_cover_phase}
### Phase 5 — Publish
1. Call save_draft to backup locally
2. Call publish_article (always with published=false)
3. Report the returned post id and slug

## Writing conventions
- Tone: direct, practical, no filler phrases
- Use concrete examples and working code snippets
- Prefer Mermaid for: architecture, flow, sequence, ER, class diagrams
- Language: match the brief (pt-BR or en)
- No emoji in article body
"""

# ---------------------------------------------------------------------------
# Tool dispatcher
# ---------------------------------------------------------------------------

def dispatch(name: str, inputs: dict) -> str:
    print(f"    ↳ {name}({', '.join(f'{k}={repr(v)[:60]}' for k, v in inputs.items())})")
    try:
        if name == "web_search":
            return web_search(inputs["query"], inputs.get("count", 5))
        elif name == "generate_cover_image":
            return generate_cover_image(inputs["prompt"])
        elif name == "publish_article":
            return json.dumps(publish_article(**inputs), ensure_ascii=False)
        elif name == "save_draft":
            return save_draft(inputs["content"], inputs["filename"])
        else:
            return f"Unknown tool: {name}"
    except Exception as exc:
        return f"Error: {exc}"


# ---------------------------------------------------------------------------
# Human-in-the-loop: outline approval
# ---------------------------------------------------------------------------

def request_outline_approval(text: str) -> str:
    outline = text.replace("AWAITING_OUTLINE_APPROVAL", "").strip()

    drafts_dir = Path(__file__).parent / "drafts"
    drafts_dir.mkdir(exist_ok=True)

    outline_file  = drafts_dir / "outline.md"
    feedback_file = drafts_dir / "feedback.md"

    outline_file.write_text(outline, encoding="utf-8")
    feedback_file.write_text(
        "<!-- Escreva seu feedback aqui. Deixe vazio para aprovar o outline. -->\n",
        encoding="utf-8",
    )

    print("\n" + "═" * 64)
    print("  OUTLINE — AGUARDANDO APROVAÇÃO")
    print("═" * 64)
    print(outline)
    print("═" * 64)
    print(f"\n  Outline salvo em : agent/drafts/outline.md")
    print(f"  Feedback em      : agent/drafts/feedback.md")
    print()
    print("  → Edite o arquivo feedback.md no seu editor")
    print("  → Deixe-o vazio para aprovar sem alterações")
    print("  → Pressione Enter aqui quando terminar")
    print()
    input("  [Enter para continuar] ")

    feedback = feedback_file.read_text(encoding="utf-8").strip()
    feedback = feedback.replace("<!-- Escreva seu feedback aqui. Deixe vazio para aprovar o outline. -->", "").strip()

    return feedback or "approved"


# ---------------------------------------------------------------------------
# Agent loop
# ---------------------------------------------------------------------------

def run(brief: dict) -> None:
    cover_status = "habilitada" if COVER_IMAGE_ENABLED else "desabilitada (OPENAI_API_KEY não configurada)"
    print(f"\n  Tópico      : {brief['topic']}")
    print(f"  Idioma      : {brief.get('language', 'pt-BR')}")
    print(f"  Categoria   : {brief.get('category', 'Tech')}")
    print(f"  Imagem capa : {cover_status}")
    print()

    messages: list[dict] = [
        {
            "role": "user",
            "content": (
                "Generate a blog article with the following brief:\n\n"
                f"Topic         : {brief['topic']}\n"
                f"Audience      : {brief.get('audience', 'software developers')}\n"
                f"Tone          : {brief.get('tone', 'technical and practical')}\n"
                f"Language      : {brief.get('language', 'pt-BR')}\n"
                f"Category      : {brief.get('category', 'Tech')}\n"
                f"Tags          : {', '.join(brief.get('tags', []))}\n"
                f"Key points    : {brief.get('key_points', 'comprehensive coverage')}\n\n"
                "Start with Phase 1 (Research), then Phase 2 (Outline)."
            ),
        }
    ]

    outline_approved = False

    while True:
        response = anthropic_client.messages.create(
            model="claude-opus-4-8",
            max_tokens=16000,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        # --- handle tool calls ---
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = dispatch(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        if tool_results:
            messages.append({"role": "user", "content": tool_results})
            continue

        # --- handle text output ---
        text = "".join(block.text for block in response.content if hasattr(block, "text"))

        # --- outline gate ---
        if "AWAITING_OUTLINE_APPROVAL" in text and not outline_approved:
            feedback = request_outline_approval(text)
            outline_approved = True

            if feedback == "approved":
                messages.append({
                    "role": "user",
                    "content": (
                        "Outline approved. Proceed with Phase 3 (write the full article), "
                        "Phase 4 (cover image), then Phase 5 (publish)."
                    ),
                })
            else:
                outline_approved = False
                messages.append({
                    "role": "user",
                    "content": (
                        f"Please revise the outline with this feedback: {feedback}\n"
                        "Show the revised outline and output AWAITING_OUTLINE_APPROVAL again."
                    ),
                })
            continue

        # --- end ---
        if response.stop_reason == "end_turn":
            print("\n" + "═" * 64)
            print(text)
            print("═" * 64)
            print("\n  Artigo salvo como rascunho. Revise e publique no painel admin.")
            break


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def _prompt(label: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"  {label}{suffix}: ").strip()
    return value or default


def main() -> None:
    global BLOG_ADMIN_TOKEN

    print("\n╔══════════════════════════════════════╗")
    print("║   Blog Article Generator — v1        ║")
    print("╚══════════════════════════════════════╝\n")

    BLOG_ADMIN_TOKEN = get_blog_token()

    brief = {
        "topic":      _prompt("Tópico"),
        "audience":   _prompt("Audiência", "software developers"),
        "tone":       _prompt("Tom", "technical and practical"),
        "language":   _prompt("Idioma (pt-BR / en)", "pt-BR"),
        "category":   _prompt("Categoria", "Tech"),
        "tags":       [t.strip() for t in _prompt("Tags (vírgula separadas)").split(",") if t.strip()],
        "key_points": _prompt("Pontos-chave a cobrir (opcional)"),
    }

    if not brief["topic"]:
        print("  Erro: tópico obrigatório.")
        sys.exit(1)

    run(brief)


if __name__ == "__main__":
    main()
