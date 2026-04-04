import os
from dotenv import load_dotenv

load_dotenv()

# Data source
DIRECTORY = "./data"

# Models
MODEL_NAME = os.getenv("MODEL_NAME", "llama3.2")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")

# Chunking
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))

# Retriever
RETRIEVER_K = int(os.getenv("RETRIEVER_K", "3"))
RETRIEVER_SCORE_THRESHOLD = float(os.getenv("RETRIEVER_SCORE_THRESHOLD", "0.2"))

# Chroma
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "legislation_ia")
DB_PATH = "./chroma_langchain_db"
