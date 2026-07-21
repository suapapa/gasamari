# Gasamari - Spotify Synced Lyrics Visualizer

> Spotify에서 현재 재생 중인 곡의 가사를 실시간 재생 위치에 맞춰 스타일리시하게 표시하는 웹 앱.

## 1. 개요

- **프로젝트 이름**: Gasamari
- **목표**: Spotify Web API로 현재 재생 곡 정보를 받아오고, 동기화된 가사(LRC)를 가져와 음악의 `progress_ms`에 맞춰 화면에 애니메이션과 함께 표시한다.
- **핵심 경험**: 전체 화면 중앙에 현재 가사 라인만을 스타일리시하게 강조 표시, 앨범아트 기반 동적 색상 테마, React Bits 텍스트 애니메이션.

## 2. 기술 스택

| 영역 | 기술 | 이유 |
|------|------|------|
| Frontend | Next.js 14+ (App Router), TypeScript | React 기반, API 라우트로 백엔드 기능 통합 가능, SSR/SEO 옵션 |
| Styling | Tailwind CSS | 빠른 UI 구축, 반응형, 다크모드 지원 |
| Components | shadcn/ui (선택) | 필요한 기본 컴포넌트(Button, Slider, Toast 등)만 사용 |
| Fonts | Righteous(heading), Poppins(body) | Google Fonts; 음악/엔터테인먼트 무드 |
| Animation | reactbits.dev Text Animations | 가사 라인별 입장/강조 애니메이션 |
| Color Extraction | fast-average-color | 브라우저에서 앨범아트의 평균색/팔레트 추출 |
| Spotify API | Spotify Web API | 현재 재생 곡 정보, 재생 위치, 앨범아트 획득 |
| Lyrics Backend | Python + FastAPI + syncedlyrics | Python 기반 LRC 가사 검색/캐싱 서비스 |
| State | React Hooks + Context | 간단한 글로벌 상태; 복잡해지면 Zustand 검토 |
| 인증 | Spotify OAuth 2.0 (Authorization Code + PKCE) | 사용자 계정으로 안전하게 로그인 |

> ⚠️ **보안 주의**: Spotify Client Secret(`18326c81140345b69998e25dc0e64aa8`)은 절대 소스코드에 포함하지 않고 `.env` 또는 비밀 관리자로 분리한다. 현재 채팅에 노출되었으므로 Spotify Dashboard에서 재발급을 권장한다.

## 3. 디자인 시스템 (UI/UX skill 추천)

- **패턴**: Immersive/Interactive Experience (전체 화면 몰입형, Skip/빠른 진행 옵션, 모바일 폴백 필수)
- **스타일**: Dark Mode (OLED) — 전용 다크모드, 눈의 피로 감소, 음악 감상에 적합
- **색상 토큰**:
  - `--color-background`: `#0F0F23`
  - `--color-primary`: `#1E1B4B`
  - `--color-secondary`: `#4338CA`
  - `--color-accent`: `#22C55E` (Spotify 그린 느낌)
  - `--color-foreground`: `#F8FAFC`
  - `--color-muted`: `#27273B`
  - `--color-border`: `#312E81`
- **타이포그래피**: Heading `Righteous`, Body `Poppins`
- **핵심 효과**: 텍스트 글로우(`text-shadow: 0 0 10px`), 다크-라이트 전환, 낮은 흰색 발산, 높은 가독성
- **반드시 피할 것**: 이모지를 아이콘으로 사용, 복잡한 레이아웃, 오디오 플레이어 UX 해치기

## 4. 시스템 아키텍처

```text
┌─────────────────────────────────────────────┐
│                 Browser                      │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │ Next.js UI   │  │ fast-average-color  │  │
│  │ - Lyrics View│  │ - Album art palette │  │
│  │ - React Bits │  └─────────────────────┘  │
│  └──────┬───────┘                            │
└─────────┼────────────────────────────────────┘
          │
          │ 1) Spotify OAuth login
          │ 2) Poll /player/currently-playing
          │    → track_id, progress_ms, album_art
          │
┌─────────▼────────────────────────────────────┐
│          Next.js API Routes /                │
│          Python FastAPI Backend              │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │ Spotify proxy│  │ syncedlyrics        │  │
│  │ (token refresh│  │ - search LRC        │  │
│  │  if needed)  │  │ - cache to disk/DB  │  │
│  └──────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────┘
```

## 5. 구현 단계

### 1단계. 프로젝트 및 개발 환경 구성
- [ ] `gasamari` 모노레포 구조 설정: `apps/web` (Next.js), `apps/api` (FastAPI)
- [ ] 패키지 매니저: pnpm + workspaces (또는 npm/yarn)
- [ ] `apps/web` 생성: `create-next-app@latest` with TypeScript, Tailwind CSS, ESLint, App Router
- [ ] `apps/api` 생성: Python 가상환경 + FastAPI + uvicorn + pydantic
- [ ] 공통 설정: `.gitignore`, `README.md`, `pnpm-workspace.yaml` 또는 `package.json` workspaces
- [ ] 코드 포맷터/린터 설정: ESLint + Prettier (web), Ruff (api)

### 2단계. Spotify 개발자 앱 설정
- [ ] Spotify Dashboard에서 앱 생성
- [ ] Redirect URI 등록: `http://localhost:3000/api/auth/callback/spotify` (개발) 및 프로덕션 도메인
- [ ] 필요한 스코프 설정: `user-read-currently-playing`, `user-read-playback-state`, `user-read-recently-played` (선택)
- [ ] Client Secret을 안전하게 환경 변수로 이동 (`SPOTIFY_CLIENT_SECRET`, `SPOTIFY_CLIENT_ID`)
- [ ] ⚠️ 노출된 Client Secret 재발급 권장

### 3단계. 인증 (Spotify OAuth) 구현
- [ ] Next.js API Route에서 PKCE 또는 Authorization Code Flow 시작 엔드포인트 구현
- [ ] `/api/auth/callback/spotify`에서 authorization code 수신, access/refresh token 교환
- [ ] Token을 안전하게 저장: HttpOnly cookie 또는 서버 세션 (LocalStorage에 access token 저장하지 않기)
- [ ] Refresh token 자동 갱신 로직 구현 (API Route 또는 백엔드에서)
- [ ] 로그인/로그아웃 UI 버튼 구현

### 4단계. 현재 재생 정보 획득 (Frontend + API)
- [ ] `/api/spotify/now-playing` API Route 구현: Spotify `GET /v1/me/player/currently-playing` 프록시
- [ ] 1초 또는 2초 간격 polling (Spotify Web Playback SDK는 재생 제어가 필요할 때; 현재는 Web API polling으로 충분)
- [ ] 응답 파싱: `track_id`, `track_name`, `artist_name`, `album_name`, `album_art`, `progress_ms`, `duration_ms`, `is_playing`
- [ ] React custom hook `useNowPlaying` 작성: polling, 에러 핸들링, 재생 상태 변화 감지
- [ ] 재생이 멈추거나 곡이 바뀌면 가사 상태 초기화

### 5단계. 동기화 가사(LRC) 백엔드 구축
- [ ] FastAPI 앱에 `/lyrics` 엔드포인트 생성: query `track`, `artist`, `album`
- [ ] `syncedlyrics`로 LRC 포맷 가사 검색
- [ ] LRC 파싱: `[mm:ss.xx] 가사` 형식을 타임스탬프(ms) + 텍스트 객체 배열로 변환
- [ ] 캐싱: 디스크(`./cache/lyrics/{hash}.json`) 또는 SQLite에 결과 저장 (같은 곡 반복 검색 방지)
- [ ] 예외 처리: 가사 없을 때 404 + 빈 객체 반환, fallback으로 일반(비동기) 가사 표시 준비
- [ ] CORS 설정: Next.js 개발/프로덕션 도메인만 허용

### 6단계. 가사와 재생 동기화 로직
- [ ] `useSyncedLyrics` custom hook 작성
- [ ] `progress_ms` + 로컬 타이머(`setInterval` or `requestAnimationFrame`)로 부드러운 시간 추적
- [ ] 현재 활성 라인 인덱스 계산: `progress_ms`가 해당 라인의 타임스탬프 범위에 들어오면 active
- [ ] 곡 변경 시 가사 재요청, 이전 타이머 정리
- [ ] 재생/일시정지 상태에 따라 타이머 일시정지/재개
- [ ] 수동 싱크 보정 오프셋 (±N ms) 옵션 제공 (Spotify API polling 지연 대응)

### 7단계. 앨범아트 기반 동적 테마
- [ ] `fast-average-color`로 앨범아트 평균색 및 팔레트 추출
- [ ] 추출 색상을 기반으로 배경 그라데이션, 텍스트 글로우, 악센트 색상 생성
- [ ] UI/UX skill 권장: dark background 위에 고대비 텍스트, 색상만으로 정보 전달하지 않기
- [ ] 색상 추출 실패 시 디폴트 디자인 시스템 색상으로 폴백
- [ ] `prefers-reduced-motion` 고려: 빠르게 변하는 배경 색상 전환 최소화 또는 끄기

### 8단계. 가사 표시 UI (React Bits + Tailwind)
- [ ] 전체 화면 레이아웃: 배경은 앨범아트/테마 색상으로 채우고, 중앙에 현재 가사 라인만 표시
- [ ] React Bits Text Animations 중 적합한 효과 선택 및 적용 (예: Blur Text, Split Text, Decode Text, Gradient Text)
- [ ] 현재 가사 라인 강조: 글로우, 스케일, 색상 변화, 부드러운 입장/퇴장 애니메이션
- [ ] 가사 라인 변경 시 crossfade 또는 인/아웃 애니메이션으로 자연스럽게 전환
- [ ] 모바일 반응형: 375px 기준, 텍스트 크기/레이아웃 최적화, safe area 고려
- [ ] 접근성: `aria-live="polite"`로 현재 가사를 스크린리더에 알림, reduced-motion 지원

### 9단계. 보조 기능 및 상태 관리
- [ ] 글로벌 상태: 현재 곡, 재생 위치, 가사 데이터, 테마 색상, 로딩/에러 상태
- [ ] 로딩 상태: skeleton 또는 스피너, 가사/색상 추출 중 피드백
- [ ] 에러 상태: Spotify 미로그인, 재생 중 아님, 가사 없음, 네트워크 오류에 대한 명확한 메시지와 복구 경로
- [ ] 재생 위치 슬라이더/프로그레스바 (읽기 전용 또는 Spotify Premium인 경우 제어)
- [ ] 곡 변경 시 트랜지션: crossfade로 앨범아트/가사 교체

### 10단계. 테스트 및 품질 확인
- [ ] 단위 테스트: LRC 파싱, 타임스탬프 계산, 색상 추출 fallback
- [ ] Spotify API mock을 사용한 integration test
- [ ] UI/UX skill Pre-Delivery Checklist:
  - [ ] 이모지를 아이콘으로 사용하지 않음 (Lucide/Heroicons)
  - [ ] 터치 타겟 44pt 이상
  - [ ] 다크모드 대비 4.5:1 이상
  - [ ] `prefers-reduced-motion` 지원
  - [ ] 반응형 375/768/1024/1440px 검증
- [ ] 성능: 이미지 최적화(WebP/AVIF), 애니메이션은 transform/opacity만, 메인 스레드 16ms 이내 유지

### 11단계. 배포
- [ ] Frontend: Vercel (Next.js)
- [ ] Backend: 개인 서버, Railway, Fly.io, 또는 Vercel과 별도 Python 호스팅
- [ ] 환경 변수 설정: Spotify Client ID/Secret, Redirect URI, API base URL
- [ ] 프로덕션 Redirect URI 등록 및 Spotify 앱 승인 요청 (Extended Quota Data 필요 시)
- [ ] 모니터링 및 로깅 추가 (Sentry 등 선택)

## 6. 파일 구조 (예상)

```text
gasamari/
├── apps/
│   ├── web/                      # Next.js 14+ App Router
│   │   ├── app/
│   │   │   ├── page.tsx            # 메인 가사 화면
│   │   │   ├── layout.tsx
│   │   │   ├── globals.css
│   │   │   └── api/                # Next.js API Routes
│   │   ├── components/
│   │   │   ├── LyricsViewer.tsx
│   │   │   ├── CurrentLyrics.tsx
│   │   │   ├── AlbumArtTheme.tsx
│   │   │   ├── NowPlayingHeader.tsx
│   │   │   └── SpotifyLoginButton.tsx
│   │   ├── hooks/
│   │   │   ├── useNowPlaying.ts
│   │   │   ├── useSyncedLyrics.ts
│   │   │   └── useAlbumArtPalette.ts
│   │   ├── lib/
│   │   │   ├── spotify.ts
│   │   │   ├── lrcParser.ts
│   │   │   └── theme.ts
│   │   └── types/
│   │       └── index.ts
│   └── api/                        # Python FastAPI
│       ├── main.py
│       ├── routes/
│       │   └── lyrics.py
│       ├── services/
│       │   └── lyrics_service.py
│       ├── models/
│       │   └── lyrics.py
│       └── cache/                  # .gitignore에 포함
├── packages/
│   └── shared-types/               # (선택) TypeScript/Python 공용 스키마
├── .cursor/
│   └── rules/                      # Cursor rules
├── AGENTS.md                       # 협업용 AI 가이드
├── PLAN.md                         # 이 문서
├── README.md
├── .gitignore
├── pnpm-workspace.yaml
└── package.json
```

## 7. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Spotify API rate limit (현재 재생 polling) | 중간 | 1~2초 polling, 429 응답 시 백오프, Web Playback SDK 고려 |
| syncedlyrics 가사 부재 | 높음 | 404 반환 + 일반 가사 fallback 또는 "가사 없음" 상태 UI |
| Client Secret 노출 | 높음 | 즉시 재발급, env 분리, GitHub secret scanning 활성화 |
| Spotify 계정별 권한 차이 | 중간 | Free 사용자는 재생 상태 읽기 가능; Premium만 재생 제어 가능하므로 가사만 표시 |
| 색상 추출 지연/실패 | 낮음 | 디폴트 팔레트로 폴백, 이미지 로드 완료 후 추출 |
| 애니메이션 성능 저하 | 중간 | transform/opacity만 사용, `will-change` 적절히, `prefers-reduced-motion` 처리 |

## 8. 향후 확장 아이디어

- Web Playback SDK 연동으로 브라우저 내 직접 재생 및 가사 싱크 정밀 제어
- 가사 소스 다양화: Musixmatch, LRCLIB, NetEase 등 추가 provider
- 사용자 가사 업로드/수정 기능
- 가사 라인별 공유 이미지 생성 (OG 이미지)
- PWA로 설치 가능하게 만들기
- 다국어 가사 지원 (한국어, 일본어, 영어 등)
