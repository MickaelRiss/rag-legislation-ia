from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from app.routers.chat import router

app = FastAPI(
    title="Project API", description="API dedicated to this project", version="1.0.0"
)

origins = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:5173",
    "http://localhost:4173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


def main():
    pass


if __name__ == "__main__":
    main()
