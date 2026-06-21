from fastapi import APIRouter, HTTPException, Request

from services.review import ReviewService

router = APIRouter()


@router.post("/review/{post_id}")
def review_post(post_id: int, request: Request):
    if not request.app.state.blog_token_manager.token:
        raise HTTPException(503, "Blog token not available")
    service: ReviewService = request.app.state.review_service
    try:
        return service.review(post_id)
    except LookupError as exc:
        raise HTTPException(404, str(exc))
    except ValueError as exc:
        raise HTTPException(422, str(exc))
