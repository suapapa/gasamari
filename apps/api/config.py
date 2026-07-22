from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    lyrics_cache_dir: Path = Path("./cache/lyrics")
    cors_origins: str = "http://localhost:3000"


settings = Settings()
