from fastapi import APIRouter, Depends, HTTPException
from app.schemas.chat import ChatRequest, ChatResponse
from app.dependencies import get_chain_singleton, get_retriever_singleton
from app.services.agent import answer_question

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    retriever=Depends(get_retriever_singleton),
    chain=Depends(get_chain_singleton),
):
    """
    Répond à une question en interrogeant le RAG.

    Le retriever récupère les documents pertinents dans ChromaDB,
    puis la chaîne LangChain génère une réponse à partir de ces documents
    et de l'historique de la session.
    """
    try:
        response = answer_question(
            question=request.question,
            session_id=request.session_id,
            retriever=retriever,
            chain=chain,
        )
        return ChatResponse(answer=response["answer"], sources=response["sources"])
    except Exception as e:
        print(f"Erreur dans /chat : {type(e).__name__}: {e}")

        raise HTTPException(
            status_code=500, detail="Erreur lors du traitement de la question"
        )


@router.get("/health")
def health():
    return {"status": "ok"}
