from fastapi import APIRouter, Depends, HTTPException, Query

from deps import lyrics_service
from models.lyrics import LyricsResponse
from services.lyrics_service import LyricsService

router = APIRouter()


def get_lyrics_service() -> LyricsService:
    return lyrics_service


@router.get("/lyrics", response_model=LyricsResponse)
def get_lyrics(
    track: str = Query(..., min_length=1),
    artist: str = Query(..., min_length=1),
    album: str = Query(default=""),
    service: LyricsService = Depends(get_lyrics_service),
) -> LyricsResponse:
    result = service.get_lyrics(track, artist, album)

    if result is None:
        raise HTTPException(status_code=404, detail="Lyrics not found")

    return LyricsResponse(**result)
