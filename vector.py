from config import EMBEDDING_MODEL, COLLECTION_NAME, DB_PATH
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma


def get_vector_store() -> Chroma:
    embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)

    return Chroma(
        persist_directory=DB_PATH,
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
    )
