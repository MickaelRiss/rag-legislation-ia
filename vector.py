from config import (
    EMBEDDING_MODEL,
    COLLECTION_NAME,
    DB_PATH,
    RETRIEVER_K,
    RETRIEVER_SCORE_THRESHOLD,
)
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma


def get_vector_store() -> Chroma:
    embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)

    return Chroma(
        persist_directory=DB_PATH,
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
    )


def get_retriever():
    vector_store = get_vector_store()
    return vector_store.as_retriever(
        # search_type="similarity_score_threshold",
        search_kwargs={"k": RETRIEVER_K},
    )
