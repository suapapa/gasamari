from pydantic import BaseModel


class LyricLine(BaseModel):
    timeMs: int
    text: str


class LyricsResponse(BaseModel):
    track: str
    artist: str
    album: str
    lines: list[LyricLine]
    synced: bool
