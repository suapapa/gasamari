from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes.lyrics import router as lyrics_router

app = FastAPI(title="Gasamari Lyrics API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(lyrics_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
