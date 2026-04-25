import os
import re
from app.config import (
    DIRECTORY,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
)
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader, BSHTMLLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from bs4 import BeautifulSoup
from vector import get_vector_store
from uuid import uuid4


def clean_text(text: str) -> str:
    cleaned = re.sub(r"\b(\w{1,2}) (?=\w{1,2}\b)", r"\1", text)
    return cleaned


def load_html(file_path: str) -> list[Document]:
    with open(file_path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "lxml")

    source_name = os.path.basename(os.path.dirname(file_path))
    file_name = os.path.basename(file_path)
    documents = []

    divs = soup.find_all("div", class_="eli-subdivision")

    if divs:
        for div in divs:
            text = div.get_text(separator=" ", strip=True)
            if len(text) < 100:
                continue
            documents.append(
                Document(
                    page_content=text,
                    metadata={
                        "source": file_name,
                        "institution": source_name,
                        "section_id": div.get("id", "unknown"),
                    },
                )
            )
    else:
        text = soup.get_text(separator=" ", strip=True)
        documents.append(
            Document(
                page_content=text,
                metadata={"source": file_name, "institution": source_name},
            )
        )

    return documents


def load_documents() -> list[Document]:
    documents = []

    for root, dirs, files in os.walk(DIRECTORY):
        for file in files:
            file_path = os.path.join(root, file)

            if file.endswith(".html"):
                documents.extend(load_html(file_path))
            elif file.endswith(".pdf"):
                loader = PyPDFLoader(file_path=file_path)
                docs = loader.load()
                documents.extend(docs)

    return documents


def chunk_documents(documents: list[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP
    )
    chunks = []
    for doc in documents:
        if len(doc.page_content) > CHUNK_SIZE:
            chunks.extend(splitter.split_documents([doc]))
        else:
            chunks.append(doc)
    return chunks


def ingest():
    vector_store = get_vector_store()

    if vector_store._collection.count() > 0:
        print("Database already populated!")
        return

    print("Database creation...")
    documents = load_documents()
    for document in documents:
        document.page_content = clean_text(document.page_content)
    chunks = chunk_documents(documents)
    uuids = [str(uuid4()) for _ in range(len(chunks))]
    vector_store.add_documents(documents=chunks, ids=uuids)
    print(f"Indexed {len(chunks)} chunks.")


if __name__ == "__main__":
    ingest()
