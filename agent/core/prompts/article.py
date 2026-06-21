TOOLS_BASE: list[dict] = [
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

_COVER_TOOL: dict = {
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
}


def build_tools_list(cover_enabled: bool) -> list[dict]:
    tools = list(TOOLS_BASE)
    if cover_enabled:
        tools.insert(2, _COVER_TOOL)
    return tools


def build_system_prompt(cover_enabled: bool) -> str:
    cover_phase = (
        "### Phase 4 — Cover Image\n"
        "Call generate_cover_image with a descriptive prompt.\n"
        "Style: \"minimalist tech illustration, flat design, dark background, professional blog cover\"\n"
        if cover_enabled
        else "### Phase 4 — Cover Image\nSkip this phase (image generation not configured).\n"
    )

    return f"""You are an expert technical writer creating high-quality blog articles.

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

{cover_phase}
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
