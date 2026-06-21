#!/usr/bin/env python3
"""CLI entry point for the article generation agent."""

import getpass
import os
import sys
from pathlib import Path

import anthropic
import requests
from dotenv import load_dotenv
from tavily import TavilyClient

load_dotenv(Path(__file__).parent / ".env")

sys.path.insert(0, str(Path(__file__).parent))

from config import settings
from core.dispatch import Dispatcher
from core.prompts import build_system_prompt, build_tools_list
from core.runner import run_agent
from core.tools import make_cover_image_fn


def get_blog_token() -> str:
    if token := os.environ.get("BLOG_ADMIN_TOKEN", ""):
        return token

    email = os.environ.get("BLOG_EMAIL", "") or input("  Blog email: ").strip()
    password = os.environ.get("BLOG_PASSWORD", "") or getpass.getpass("  Blog senha: ")

    resp = requests.post(
        f"{settings.blog_api_url}/api/auth/login",
        json={"email": email, "password": password},
        timeout=10,
    )
    if not resp.ok:
        print(f"\n  Erro ao autenticar: {resp.status_code} {resp.text}")
        sys.exit(1)

    print("  Autenticado.\n")
    return resp.json()["token"]


def request_outline_approval(outline_text: str) -> str:
    drafts_dir = Path(__file__).parent / "drafts"
    drafts_dir.mkdir(exist_ok=True)

    outline_file = drafts_dir / "outline.md"
    feedback_file = drafts_dir / "feedback.md"

    outline_file.write_text(outline_text, encoding="utf-8")
    feedback_file.write_text(
        "<!-- Escreva seu feedback aqui. Deixe vazio para aprovar o outline. -->\n",
        encoding="utf-8",
    )

    print("\n" + "=" * 64)
    print("  OUTLINE — AGUARDANDO APROVACAO")
    print("=" * 64)
    print(outline_text)
    print("=" * 64)
    print(f"\n  Outline salvo em : agent/drafts/outline.md")
    print(f"  Feedback em      : agent/drafts/feedback.md")
    print("\n  -> Edite o arquivo feedback.md no seu editor")
    print("  -> Deixe-o vazio para aprovar sem alteracoes")
    print("  -> Pressione Enter aqui quando terminar\n")
    input("  [Enter para continuar] ")

    feedback = feedback_file.read_text(encoding="utf-8").strip()
    feedback = feedback.replace(
        "<!-- Escreva seu feedback aqui. Deixe vazio para aprovar o outline. -->", ""
    ).strip()

    return feedback or "approved"


def _cli_on_event(event_type: str, **data) -> None:
    if event_type == "started":
        print("\n  [iniciando agente...]\n")
    elif event_type == "search":
        print(f"  [+] Pesquisando: {data.get('query', '')}")
    elif event_type == "cover":
        print("  [+] Gerando imagem de capa...")
    elif event_type == "publishing":
        print("  [+] Publicando artigo...")
    elif event_type == "post_created":
        print(f"  [OK] Artigo criado: #{data.get('postId')} — {data.get('slug')}")
    elif event_type == "outline":
        pass
    elif event_type == "writing":
        print("\n  [+] Escrevendo artigo...\n")
    elif event_type == "done":
        print("\n" + "=" * 64)
        print("  Artigo salvo como rascunho. Revise e publique no painel admin.")
        print("=" * 64)
    elif event_type == "error":
        print(f"\n  [ERRO] {data.get('message', 'unknown')}")
    elif event_type == "cancelled":
        print("\n  [cancelado]")


def _prompt(label: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"  {label}{suffix}: ").strip()
    return value or default


def main() -> None:
    print("\n+--------------------------------------+")
    print("|   Blog Article Generator             |")
    print("+--------------------------------------+\n")

    blog_token = get_blog_token()

    brief = {
        "topic":      _prompt("Topico"),
        "audience":   _prompt("Audiencia", "software developers"),
        "tone":       _prompt("Tom", "technical and practical"),
        "language":   _prompt("Idioma (pt-BR / en)", "pt-BR"),
        "category":   _prompt("Categoria", "Tech"),
        "tags":       [t.strip() for t in _prompt("Tags (virgula separadas)").split(",") if t.strip()],
        "key_points": _prompt("Pontos-chave a cobrir (opcional)"),
    }

    if not brief["topic"]:
        print("  Erro: topico obrigatorio.")
        sys.exit(1)

    cover_fn = (
        make_cover_image_fn(
            settings.openai_api_key,
            settings.cloudinary_cloud_name,
            settings.cloudinary_api_key,
            settings.cloudinary_api_secret,
        )
        if settings.cover_image_enabled
        else None
    )
    tavily_client = TavilyClient(api_key=settings.tavily_api_key)
    dispatcher = Dispatcher(
        blog_api_url=settings.blog_api_url,
        get_blog_token=lambda: blog_token,
        tavily_client=tavily_client,
        cover_image_fn=cover_fn,
    )

    cover_status = "habilitada" if settings.cover_image_enabled else "desabilitada"
    print(f"\n  Topico      : {brief['topic']}")
    print(f"  Idioma      : {brief.get('language', 'pt-BR')}")
    print(f"  Categoria   : {brief.get('category', 'Tech')}")
    print(f"  Imagem capa : {cover_status}\n")

    run_agent(
        brief=brief,
        anthropic_client=anthropic.Anthropic(api_key=settings.anthropic_api_key),
        dispatcher=dispatcher,
        system_prompt=build_system_prompt(settings.cover_image_enabled),
        tools=build_tools_list(settings.cover_image_enabled),
        on_event=_cli_on_event,
        request_approval=request_outline_approval,
    )


if __name__ == "__main__":
    main()
