import os
from config import (
    DIRECTORY,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
)
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from vector import get_vector_store
from uuid import uuid4


def load_documents() -> list[Document]:
    documents = []

    for root, dirs, files in os.walk(DIRECTORY):
        for file in files:
            if file.endswith(".pdf"):
                file_path = os.path.join(root, file)
                loader = PyPDFLoader(file_path=file_path)
                document = loader.load()
                documents.extend(document)

    return documents


def chunk_documents(documents: list[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP
    )
    return splitter.split_documents(documents)


def ingest():
    vector_store = get_vector_store()

    if vector_store._collection.count() > 0:
        print("Database already populated!")
        return

    print("Database creation...")
    documents = load_documents()
    chunks = chunk_documents(documents)
    uuids = [str(uuid4()) for _ in range(len(chunks))]
    vector_store.add_documents(documents=chunks, ids=uuids)
    print(f"Indexed {len(chunks)} chunks.")


if __name__ == "__main__":
    ingest()
