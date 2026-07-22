# Gasamari

Spotify에서 현재 재생 중인 곡의 **동기화 가사(LRC)** 를 실시간으로 화면 중앙에 표시하는 몰입형 웹 앱입니다.

앨범아트에서 추출한 색상으로 배경 테마가 바뀌고, React Bits 스타일의 블러 텍스트 애니메이션으로 가사가 전환됩니다.

## 주요 기능

- Spotify OAuth 2.0 (PKCE) 로그인
- 현재 재생 곡 정보 실시간 polling (`progress_ms` 동기화)
- `syncedlyrics` 기반 LRC 가사 검색 및 디스크 캐싱
- 앨범아트 기반 동적 색상 테마
- 현재 가사 라인만 전체 화면 중앙에 강조 표시
- 싱크 오프셋 수동 보정 (±500ms)
- `prefers-reduced-motion` 접근성 지원

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Python 3.11+, FastAPI, syncedlyrics |
| Auth | Spotify OAuth 2.0 + PKCE (HttpOnly Cookie) |
| Monorepo | pnpm workspaces |

## 사전 요구사항

- Node.js 20+
- pnpm 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (Python 패키지/환경 관리)
- [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) 앱

## Spotify 앱 설정

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)에서 새 앱을 생성합니다.
2. **Redirect URI**에 다음을 **모두** 등록합니다 (Spotify는 접속 주소와 정확히 일치해야 합니다):
   - `http://localhost:3000/api/auth/callback/spotify`
   - `http://127.0.0.1:3000/api/auth/callback/spotify`
   - 프로덕션: `https://your-domain.com/api/auth/callback/spotify`
3. Client ID와 Client Secret을 확인합니다.
4. ⚠️ Client Secret이 외부에 노출된 적이 있다면 Dashboard에서 **재발급**하세요.

## 설치 및 실행

### 1. 저장소 클론 및 의존성 설치

```bash
git clone <repository-url>
cd gasamari
pnpm install
```

### 2. 환경 변수 설정

**Frontend** (`apps/web/.env.local`):

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback/spotify
API_BASE_URL=http://127.0.0.1:8000
```

**Backend** (`apps/api/.env`):

```env
LYRICS_CACHE_DIR=./cache/lyrics
CORS_ORIGINS=http://localhost:3000
```

루트의 `.env.example`과 각 앱의 `.env.local.example`, `.env.example`도 참고하세요.
`API_BASE_URL`은 서버 전용입니다. 브라우저는 `/api/lyrics`만 호출하고 Next가 FastAPI로 프록시합니다.

### 3. Python API 의존성 (uv)

```bash
cd apps/api
uv sync
```

`uv sync`가 Python 버전 확인, `.venv` 생성, 의존성 설치를 한 번에 처리합니다.

### 4. 개발 서버 실행

루트에서 두 서버를 동시에 실행:

```bash
pnpm dev
```

또는 개별 실행:

```bash
# Terminal 1 — Frontend (http://localhost:3000)
pnpm dev:web

# Terminal 2 — Backend (http://localhost:8000)
pnpm dev:api
```

### 5. 사용 방법

1. 브라우저에서 [http://localhost:3000](http://localhost:3000) 접속
2. **Connect Spotify** 버튼으로 로그인
3. Spotify 앱(데스크톱/모바일)에서 음악 재생
4. 화면 중앙에 동기화된 가사가 표시됩니다
5. 가사 싱크가 맞지 않으면 하단 **Sync offset** 버튼으로 조정

## 프로젝트 구조

```text
gasamari/
├── apps/
│   ├── web/                 # Next.js 프론트엔드
│   │   ├── app/             # App Router, API Routes
│   │   ├── components/      # UI 컴포넌트
│   │   ├── hooks/           # useNowPlaying, useSyncedLyrics 등
│   │   └── lib/             # Spotify, LRC 파서, 테마 유틸
│   └── api/                 # FastAPI 가사 백엔드
│       ├── routes/          # /lyrics 엔드포인트
│       ├── services/        # syncedlyrics + 캐싱
│       └── cache/           # 가사 캐시 (gitignore)
├── PLAN.md                  # 상세 구현 계획
├── AGENTS.md                # AI 에이전트 협업 가이드
└── README.md
```

## API 엔드포인트

### Frontend (Next.js)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/auth/login` | Spotify OAuth 시작 |
| GET | `/api/auth/callback/spotify` | OAuth 콜백 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/status` | 인증 상태 확인 |
| GET | `/api/spotify/now-playing` | 현재 재생 곡 정보 |
| GET | `/api/lyrics?track=&artist=&album=` | 가사 검색 (FastAPI 프록시) |

### Backend (FastAPI)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |
| GET | `/lyrics?track=&artist=&album=` | LRC 가사 검색 |

## 스크립트

```bash
pnpm dev          # web + api 동시 실행
pnpm dev:web      # Next.js만
pnpm dev:api      # FastAPI (uv run)
pnpm build        # Next.js 프로덕션 빌드
pnpm lint         # ESLint (web) + Ruff (api)
```

API만 직접 실행할 때:

```bash
cd apps/api
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
uv run ruff check .
```

또는 루트에서:

```bash
pnpm dev:api
```

## 배포

| 서비스 | 권장 플랫폼 |
|--------|------------|
| Frontend | Vercel |
| Backend | Railway, Fly.io, 또는 개인 서버 |

배포 시 루트 `.env` 예시 (`0.0.0.0` / 브라우저용 `localhost` 금지):

```env
APP_URL=https://your-domain.com
SPOTIFY_REDIRECT_URI=https://your-domain.com/api/auth/callback/spotify
API_BASE_URL=http://api:8000
CORS_ORIGINS=https://your-domain.com
```

- `API_BASE_URL`은 **컨테이너 내부**에서 Next → FastAPI 주소입니다. Docker Compose 기본값은 `http://api:8000`이며, 공개 URL이 필요 없습니다.
- Spotify Dashboard Redirect URI에도 같은 `SPOTIFY_REDIRECT_URI`를 등록한 뒤 컨테이너를 다시 띄우세요.
- Docker의 `HOSTNAME=0.0.0.0`은 바인드 주소일 뿐이며, OAuth 리다이렉트에 쓰면 `ERR_CONNECTION_REFUSED`가 납니다.

## 알려진 제한사항

- Spotify Web API polling 간격(2초)으로 인해 가사 싱크에 약간의 지연이 있을 수 있습니다. Sync offset으로 보정 가능합니다.
- `syncedlyrics`가 가사를 찾지 못하는 곡은 "Synced lyrics not found" 메시지가 표시됩니다.
- Spotify Free/Premium 모두 현재 재생 상태 읽기는 가능합니다. 재생 제어는 Premium 전용입니다.

## 라이선스

Private project — 라이선스는 저장소 소유자에게 문의하세요.

## 참고

- [PLAN.md](./PLAN.md) — 상세 구현 계획
- [AGENTS.md](./AGENTS.md) — AI 에이전트 협업 가이드
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [syncedlyrics](https://github.com/moehmeni/syncedlyrics)
