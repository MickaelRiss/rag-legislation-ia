from pydantic import BaseModel, Field
# from typing import Optional


class Source(BaseModel):
    content: str = Field(..., description="Le contenu textuel du chunck du documents")
    metadata: dict = Field(
        default_factory=dict,
        description="Métadonnées du document (fichier source, page, etc.)",
    )


class ChatRequest(BaseModel):
    question: str = Field(
        ..., min_length=1, description="La question posée par l'utilisateur"
    )
    session_id: str = Field(
        default="default",
        description="Identifiant de conversation pour préserver l'historique",
    )


class ChatResponse(BaseModel):
    answer: str = Field(
        ...,
        description="La réponse générée par le LLM",
    )
    sources: list[Source] = Field(
        default_factory=list,
        description="Les documents sources utilisés pour générer la réponse",
    )
