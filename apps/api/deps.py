from config import settings
from services.lyrics_service import LyricsService

lyrics_service = LyricsService(settings.lyrics_cache_dir)
