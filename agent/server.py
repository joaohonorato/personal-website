#!/usr/bin/env python3
"""
FastAPI entry point — app wiring only. No business logic here.

Endpoints:
  GET  /health               — health check (Railway)
  POST /run                  — start article generation
  GET  /stream/{id}          — SSE stream of agent events
  POST /approve/{id}         — send outline feedback
  POST /cancel/{id}          — cancel a running job
  POST /review/{postId}      — review a published post
  POST /linkedin/adapt/{id}  — adapt post for LinkedIn
  GET  /linkedin/stream/{id} — SSE stream for LinkedIn job
  POST /linkedin/iterate/{id}
  POST /linkedin/approve/{id}
"""

import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jose import JWTError, jwt as jose_jwt
from tavily import TavilyClient

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

sys.path.insert(0, str(Path(__file__).parent))

from api.routers.article import router as article_router
from api.routers.linkedin import router as linkedin_router
from api.routers.review import router as review_router
from auth import BlogTokenManager, JwksCache
from config import settings
from core.dispatch import Dispatcher
from core.prompts import build_system_prompt, build_tools_list
from core.tools import make_cover_image_fn
from jobs import JobRegistry
from services.article import ArticleService
from services.linkedin import LinkedInService
from services.review import ReviewService


@asynccontextmanager
async def lifespan(app: FastAPI):
    jwks_cache = JwksCache(settings.auth_server_url)

    blog_token_manager = BlogTokenManager(
        settings.auth_server_url,
        settings.auth_client_id,
        settings.auth_client_secret,
    )
    blog_token_manager.start()

    tavily_client = TavilyClient(api_key=settings.tavily_api_key)
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
    anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    dispatcher = Dispatcher(
        blog_api_url=settings.blog_api_url,
        get_blog_token=lambda: blog_token_manager.token,
        tavily_client=tavily_client,
        cover_image_fn=cover_fn,
    )
    job_registry = JobRegistry()

    app.state.settings = settings
    app.state.jwks_cache = jwks_cache
    app.state.blog_token_manager = blog_token_manager
    app.state.anthropic_client = anthropic_client
    app.state.job_registry = job_registry
    app.state.article_service = ArticleService(
        job_registry=job_registry,
        anthropic_client=anthropic_client,
        dispatcher=dispatcher,
        system_prompt=build_system_prompt(settings.cover_image_enabled),
        tools=build_tools_list(settings.cover_image_enabled),
    )
    app.state.review_service = ReviewService(
        blog_api_url=settings.blog_api_url,
        get_blog_token=lambda: blog_token_manager.token,
        anthropic_client=anthropic_client,
    )
    app.state.linkedin_service = LinkedInService(
        job_registry=job_registry,
        blog_api_url=settings.blog_api_url,
        auth_server_url=settings.auth_server_url,
        get_blog_token=lambda: blog_token_manager.token,
        anthropic_client=anthropic_client,
    )

    logger.info(
        "[OK] Agent started — blog_api=%s cover_image=%s",
        settings.blog_api_url,
        settings.cover_image_enabled,
    )
    yield


app = FastAPI(title="Blog Agent Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def verify_jwt(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)
    if not settings.auth_server_url:
        return await call_next(request)

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return JSONResponse({"error": "Unauthorized: missing token"}, status_code=401)

    token = auth[len("Bearer "):].strip()
    try:
        key = request.app.state.jwks_cache.select_key(token)
        payload = jose_jwt.decode(token, key, algorithms=["RS256"], options={"verify_aud": False})
    except JWTError as exc:
        return JSONResponse({"error": f"Invalid token: {exc}"}, status_code=401)
    except Exception as exc:
        return JSONResponse({"error": f"Auth service unavailable: {exc}"}, status_code=503)

    roles = set(payload.get("roles", []))
    if not roles.intersection(settings.allowed_roles):
        return JSONResponse(
            {"error": f"Forbidden: roles {list(roles)} cannot use the agent"},
            status_code=403,
        )

    return await call_next(request)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "blog_api": settings.blog_api_url,
        "cover_image": settings.cover_image_enabled,
    }


app.include_router(article_router)
app.include_router(review_router)
app.include_router(linkedin_router)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)
