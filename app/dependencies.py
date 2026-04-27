from functools import lru_cache
from app.services.vector import get_retriever
from app.services.agent import build_chain


@lru_cache
def get_retriever_singleton():
    """
    Renvoie l'instance unique du retriever ChromaDB.

    Le retriever est initialisé une seule fois (chargement de la base vectorielle, instanciation des embeddings) puis réutilisé pour toutes les requêtes grâce au cache lru_cache.
    """
    return get_retriever()


@lru_cache
def get_chain_singleton():
    """
    Renvoie l'instance unique de la chaîne LangChain.

    La chaîne (prompt + LLM + parser) est construite une seule fois et réutilisée pour toutes les requêtes.
    """
    return build_chain()
