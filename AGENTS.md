# AGENTS.md - Gasamari Project Guide

> 다른 AI 에이전트가 이 프로젝트를 안전하고 일관되게 작업할 수 있도록 작성한 협업 가이드입니다.  
> 시작하기 전에 `PLAN.md`와 이 문서를 반드시 읽고, `.cursor/rules/`의 규칙을 따르세요.

## 1. 프로젝트 요약

- **이름**: Gasamari
- **목적**: Spotify에서 현재 재생 중인 곡의 **현재 가사 라인만**을 음악의 `progress_ms`에 맞춰 스타일리시하게 표시하는 웹 앱.
- **구성**: Next.js(frontend) + FastAPI(backend) 모노레포.
- **핵심 기술**: Spotify Web API, `syncedlyrics`(Python), React Bits, `fast-average-color`, Tailwind CSS.

## 2. 작업 전 필수 체크리스트

- [ ] `PLAN.md`를 끝까지 읽었는가?
- [ ] 현재 워크스페이스의 `apps/web` 또는 `apps/api` 구조를 확인했는가?
- [ ] 변경하려는 파일이 이미 존재하는지 확인 후, 존재하면 먼저 읽고 수정했는가?
- [ ] 새로운 의존성을 추가할 때는 `package.json` 또는 `apps/api/pyproject.toml`도 함께 업데이트했는가?
- [ ] Spotify Client Secret 등 민감값을 소스코드에 포함하지 않았는가?

## 3. 기술 스택 및 구조

### Frontend (`apps/web`)

- **Framework**: Next.js 14+ App Router, TypeScript
- **Styling**: Tailwind CSS, `globals.css`에 디자인 토큰 정의
- **Fonts**: `Righteous`(heading), `Poppins`(body) — Google Fonts
- **Animation**: React Bits 텍스트 애니메이션 컴포넌트
- **State**: React Hooks + Context (복잡해지면 Zustand 검토)
- **Icons**: Lucide React 또는 Heroicons (이모지 사용 금지)

### Backend (`apps/api`)

- **Framework**: FastAPI, Python 3.11+
- **Package manager**: [uv](https://docs.astral.sh/uv/) — `uv sync`, `uv run`
- **Lyrics**: `syncedlyrics` Python 패키지
- **Cache**: 디스크 `./cache/lyrics/` 또는 SQLite (`.gitignore`에 포함됨)
- **CORS**: Next.js 개발/프로덕션 도메인만 허용

### 공통

- **Monorepo**: pnpm workspaces 사용
- **Lint/Format**: Prettier + ESLint (web), Ruff (api)
- **API 통신**: Next.js API Routes를 통해 Spotify 프록시, 별도 FastAPI `/lyrics` 사용

## 4. 중요 규칙

### 보안 (절대 어기지 말 것)

- **Spotify Client Secret(`18326c81140345b69998e25dc0e64aa8`)은 절대 하드코딩하지 않는다.**  
  이미 채팅에 노출되었으므로, 사용자에게 Spotify Dashboard에서 재발급을 권장하라.
- 모든 민감값은 환경 변수에 저장: `.env.local`(web), `.env`(api).
- Token은 HttpOnly cookie 또는 서버 세션에 저장. LocalStorage 사용 금지.
- API 응답에는 Spotify refresh token이나 전체 token을 포함하지 않는다.

### 코드 스타일

- TypeScript: 엄격 모드(`strict: true`) 사용, `any`는 최소한으로 사용하고 대신 `unknown` + 타입 가드 사용.
- Python: PEP 8, FastAPI 의존성 주입, Pydantic 모델 사용, Ruff 형식 준수.
- 컴포넌트: 기능별로 분리, custom hook은 `hooks/` 폴더, 재사용 가능한 유틸은 `lib/` 폴더.
- 파일명: 컴포넌트는 PascalCase(`LyricsLine.tsx`), 훅/유틸은 camelCase(`useNowPlaying.ts`).

### UI/UX

- 디자인 시스템은 `PLAN.md`의 "디자인 시스템" 섹션을 따른다.
- 다크모드 전용(OLED)로, 배경 `#0F0F23`, 전경 `#F8FAFC`, 악센트 `#22C55E`.
- 텍스트 대비는 WCAG AA(4.5:1) 이상을 유지.
- 애니메이션은 transform/opacity만 사용, `prefers-reduced-motion` 존중.
- 터치 타겟은 44×44pt 이상, 모바일 safe area 고려.

### 데이터 흐름

1. Frontend가 Next.js API Route를 통해 Spotify 현재 재생 정보 polling.
2. `track_id`, `progress_ms`, `album_art`, `is_playing` 등 획득.
3. Frontend가 FastAPI `/lyrics`로 가사 요청 (`track`, `artist`, `album`).
4. Backend가 `syncedlyrics`로 LRC 검색 후 파싱/캐싱, JSON 반환.
5. Frontend가 `progress_ms`와 LRC 타임스탬프를 비교해 현재 라인 계산.
6. `fast-average-color`로 앨범아트 팔레트 추출 후 테마 적용.
7. React Bits 텍스트 애니메이션으로 **현재 가사 라인만** 화면 중앙에 스타일리시하게 표시.

## 5. 환경 변수

### `apps/web` (`.env.local`)

```env
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback/spotify
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### `apps/api` (`.env`)

```env
LYRICS_CACHE_DIR=./cache/lyrics
CORS_ORIGINS=http://localhost:3000
```

> `.env*` 파일은 절대 커밋하지 않는다. 샘플은 `.env.example`로 제공.

## 6. Cursor Rules

`.cursor/rules/` 디렉토리에 다음과 같은 규칙 파일을 두고 작업할 때 참조하세요.

### `security.mdc`

```text
---
description: Security rules for Gasamari
globs: **/*
alwaysApply: true
---

- Never hardcode Spotify Client Secret or access tokens.
- Store secrets in environment variables only.
- Use HttpOnly cookies for storing Spotify tokens.
- Do not expose refresh tokens in API responses or logs.
```

### `typescript.mdc`

```text
---
description: TypeScript conventions for Gasamari web app
globs: apps/web/**/*.{ts,tsx}
alwaysApply: true
---

- Use strict TypeScript. Avoid `any`; prefer `unknown` with type guards.
- Keep components small and focused; extract logic into custom hooks.
- Use Tailwind CSS for styling; avoid inline styles for layout.
- Prefer server-side token handling in API routes over exposing tokens to client.
```

### `python.mdc`

```text
---
description: Python/FastAPI conventions for Gasamari API
globs: apps/api/**/*.py
alwaysApply: true
---

- Use Pydantic models for request/response validation.
- Keep FastAPI routes thin; business logic goes to `services/`.
- Cache lyrics results to disk to avoid repeated syncedlyrics calls.
- Handle exceptions with clear HTTP status codes and messages.
```

### `ui-ux.mdc`

```text
---
description: UI/UX design rules for Gasamari
globs: apps/web/**/*.{tsx,css}
alwaysApply: true
---

- Follow the dark OLED design system in PLAN.md.
- Display only the current synced lyrics line; previous/next lines are not shown.
- Use Lucide/Heroicons; never use emojis as UI icons.
- Respect `prefers-reduced-motion`.
- Maintain minimum 4.5:1 text contrast.
- Touch targets must be at least 44×44pt.
```

## 7. 작업 흐름 예시

### 새로운 기능을 추가할 때

1. `PLAN.md`의 단계를 확인하고 해당 단계에 맞는 범위를 선택.
2. 관련 `.cursor/rules/` 파일을 열어 제약 확인.
3. 필요한 API/컴포넌트/훅 설계 후, 먼저 타입/인터페이스를 작성.
4. 구현 후 `pnpm lint` (web) 또는 `ruff check .` (api) 실행.
5. 변경 사항을 간결하게 문서화하거나 사용자에게 요약.

### 버그를 수정할 때

1. 재현 경로와 예상/실제 동작을 명확히 파악.
2. Spotify API rate limit, token 만료, 가사 부재 등 흔한 원인부터 확인.
3. 로깅을 추가하지 말고, 실제 문제를 해결하는 코드 변경.
4. 테스트를 작성하거나 기존 테스트를 실행.

## 8. 문의 및 참고

- 상세 구현 계획: `PLAN.md`
- 디자인 시스템: `PLAN.md`의 "디자인 시스템" 섹션 및 `.cursor/rules/ui-ux.mdc`
- Spotify API 문서: https://developer.spotify.com/documentation/web-api
- `syncedlyrics`: https://github.com/moehmeni/syncedlyrics
- React Bits: https://reactbits.dev/
