import hashlib
import json
import re
from pathlib import Path

import syncedlyrics

LRC_LINE_REGEX = re.compile(r"\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)")
FEATURE_SUFFIX_REGEX = re.compile(
    r"\s*[\(\[]\s*(with|feat\.?|ft\.?|featuring)\s+.+?[\)\]]\s*$",
    re.IGNORECASE,
)


def parse_lrc(lrc: str) -> list[dict[str, int | str]]:
    lines: list[dict[str, int | str]] = []

    for raw_line in lrc.split("\n"):
        match = LRC_LINE_REGEX.match(raw_line.strip())
        if not match:
            continue

        minutes = int(match.group(1))
        seconds = int(match.group(2))
        fraction = int(match.group(3).ljust(3, "0")) if match.group(3) else 0
        text = match.group(4).strip()

        if not text:
            continue

        lines.append(
            {
                "timeMs": minutes * 60_000 + seconds * 1_000 + fraction,
                "text": text,
            }
        )

    lines.sort(key=lambda line: line["timeMs"])
    return lines


def cache_key(track: str, artist: str, album: str) -> str:
    raw = f"{track}|{artist}|{album}".lower()
    return hashlib.sha256(raw.encode()).hexdigest()


def primary_artist(artist: str) -> str:
    """Use the first credited artist for fallback search queries."""
    return re.split(r"\s*,\s*|\s*&\s*|\s+x\s+", artist, maxsplit=1)[0].strip()


def strip_feature_suffix(track: str) -> str:
    """Remove `(with …)` / `(feat. …)` style suffixes from a track title."""
    return FEATURE_SUFFIX_REGEX.sub("", track).strip()


def build_search_terms(track: str, artist: str) -> list[str]:
    """Build progressively simpler search queries for syncedlyrics providers."""
    clean_track = strip_feature_suffix(track) or track
    main_artist = primary_artist(artist) or artist
    candidates = [
        f"{track} - {artist}",
        f"{clean_track} - {artist}",
        f"{clean_track} - {main_artist}",
        f"{clean_track} {main_artist}",
        f"{track} {main_artist}",
    ]

    seen: set[str] = set()
    terms: list[str] = []
    for term in candidates:
        normalized = " ".join(term.split())
        key = normalized.lower()
        if not normalized or key in seen:
            continue
        seen.add(key)
        terms.append(normalized)
    return terms


class LyricsService:
    def __init__(self, cache_dir: Path) -> None:
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _cache_path(self, key: str) -> Path:
        return self.cache_dir / f"{key}.json"

    def _read_cache(self, key: str) -> dict | None:
        path = self._cache_path(key)
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return None

    def _write_cache(self, key: str, data: dict) -> None:
        path = self._cache_path(key)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def _search_synced_lrc(self, track: str, artist: str) -> str | None:
        for search_term in build_search_terms(track, artist):
            # Prefer timed LRC only — plain lyrics cannot drive the visualizer.
            lrc = syncedlyrics.search(search_term, synced_only=True)
            if not lrc:
                continue
            if parse_lrc(lrc):
                return lrc
        return None

    def get_lyrics(self, track: str, artist: str, album: str) -> dict | None:
        key = cache_key(track, artist, album)
        cached = self._read_cache(key)
        if cached is not None:
            return cached

        lrc = self._search_synced_lrc(track, artist)
        if not lrc:
            return None

        lines = parse_lrc(lrc)
        if not lines:
            return None

        result = {
            "track": track,
            "artist": artist,
            "album": album,
            "lines": lines,
            "synced": True,
        }

        self._write_cache(key, result)
        return result
