from pydantic import BaseModel


class Brief(BaseModel):
    topic: str
    audience: str = "software developers"
    tone: str = "technical and practical"
    language: str = "pt-BR"
    category: str = "Tech"
    tags: list[str] = []
    keyPoints: str = ""


class ApprovalBody(BaseModel):
    feedback: str = ""


class LinkedInIterateBody(BaseModel):
    feedback: str


class LinkedInApproveBody(BaseModel):
    text: str | None = None
