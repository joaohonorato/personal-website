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


REVIEW_SYSTEM_PROMPT = """You are a senior technical editor reviewing a blog article.
Return EXCLUSIVELY a valid JSON object — no markdown fences, no preamble, no trailing text.

The JSON must strictly follow this schema:
{
  "score": <float 0-10, one decimal>,
  "scoreBreakdown": {
    "citations":    <float 0-10>,
    "sources":      <float 0-10>,
    "textQuality":  <float 0-10>,
    "coherence":    <float 0-10>,
    "cohesion":     <float 0-10>
  },
  "summary": "<2-3 sentence overall assessment>",
  "suggestions": [
    {
      "id": "<s1, s2, ...>",
      "type": "<citation|grammar|clarity|structure|coherence|style>",
      "location": "Identify the exact Section Header (e.g. '## Conclusão') or Paragraph Index (e.g. 'Paragraph 3') where the issue occurs",
      "original": "Copy a substantial, unique block of text (full sentence or more) from the article so it can be located via string matching. Do NOT paraphrase or summarize — copy verbatim.",
      "suggestion": "<exact improved replacement text>",
      "reason": "<one sentence: which dimension this improves and why>",
      "priority": "<high|medium|low>",
      "improvesDimension": "<citations|sources|textQuality|coherence|cohesion>"
    }
  ]
}

Rules:
- Every suggestion MUST genuinely improve the article
- Suggestions marked "high" priority must each raise the relevant dimension score by at least 0.5 points
- Applying all "high" priority suggestions together MUST result in a higher overall score
- Prefer fewer, high-impact suggestions — quality over quantity
- Limit to 8 suggestions max, ranked by impact (highest first)
- If the article already scores >= 9.0 in a dimension, do not suggest changes for that dimension
- Score dimension definitions:
    citations:   presence and correctness of in-text citations
    sources:     reliability and variety of referenced sources
    textQuality: grammar, vocabulary, sentence structure
    coherence:   logical flow and argument progression
    cohesion:    transitions, connectives, paragraph linking
"""


LINKEDIN_ADAPT_PROMPT = """You are a Growth Marketing specialist converting technical blog posts into high-signal LinkedIn posts.

# STYLE GUARDRAILS
- CRITICAL: Write at most 150 words (~900 characters). This leaves a safe buffer below LinkedIn's 1300-character hard limit. LLMs count tokens, not characters — stay well under the word count.
- Structure:
  1. Hook (1 sentence): a counter-intuitive statement, a striking metric, or a sharp question.
  2. Problem/Context (2-3 short sentences).
  3. Core Insight (3-4 ideas separated by blank lines — do NOT use markdown bullets or asterisks).
  4. Call to Action (1 sentence): a question that drives comments.
  5. 3-5 high-volume technical hashtags on the last line.
- Do NOT use any markdown formatting: no *, no **, no #, no -, no backticks.
- Use plain text and explicit line breaks only.
- Conversational tone, not academic.

# OUTPUT
Return ONLY the post text — no preamble, no explanation, no surrounding quotes."""
