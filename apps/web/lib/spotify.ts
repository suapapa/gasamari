import crypto from "crypto";
import { cookies } from "next/headers";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
].join(" ");

export const COOKIE_NAMES = {
  accessToken: "spotify_access_token",
  refreshToken: "spotify_refresh_token",
  expiresAt: "spotify_token_expires_at",
  codeVerifier: "spotify_code_verifier",
} as const;

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function getSpotifyConfig() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify environment variables");
  }

  return { clientId, clientSecret };
}

function isUnusableOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "0.0.0.0" || hostname === "::" || hostname === "[::]";
  } catch {
    return true;
  }
}

/**
 * Public site origin for OAuth redirect_uri and post-auth redirects.
 * Docker/Next sets HOSTNAME=0.0.0.0 for bind address; request.url can then
 * become http://0.0.0.0:3000 — never use that in browser redirects.
 */
export function resolveAppOrigin(request: {
  nextUrl: { origin: string; protocol: string };
  headers: Headers;
}): string {
  const configured =
    process.env.APP_URL?.replace(/\/$/, "") ||
    (process.env.SPOTIFY_REDIRECT_URI
      ? new URL(process.env.SPOTIFY_REDIRECT_URI).origin
      : undefined);

  if (configured && !isUnusableOrigin(configured)) {
    return configured;
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request.nextUrl.protocol.replace(":", "");

  if (forwardedHost) {
    const origin = `${forwardedProto}://${forwardedHost}`;
    if (!isUnusableOrigin(origin)) return origin;
  }

  const host = request.headers.get("host");
  if (host) {
    const origin = `${forwardedProto}://${host}`;
    if (!isUnusableOrigin(origin)) return origin;
  }

  if (!isUnusableOrigin(request.nextUrl.origin)) {
    return request.nextUrl.origin;
  }

  throw new Error(
    "Cannot resolve public app origin. Set APP_URL or SPOTIFY_REDIRECT_URI to your public URL.",
  );
}

export function resolveRedirectUri(requestOrigin: string): string {
  if (process.env.SPOTIFY_REDIRECT_URI) {
    return process.env.SPOTIFY_REDIRECT_URI;
  }

  return `${requestOrigin}/api/auth/callback/spotify`;
}

export function buildAuthUrl(
  state: string,
  codeChallenge: string,
  redirectUri: string,
): string {
  const { clientId } = getSpotifyConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    state,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const { clientId } = getSpotifyConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenResponse> {
  const { clientId, clientSecret } = getSpotifyConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json() as Promise<TokenResponse>;
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function persistRefreshedTokens(
  cookieStore: CookieStore,
  tokens: TokenResponse,
): void {
  const newExpiresAt = Date.now() + tokens.expires_in * 1_000;

  cookieStore.set(COOKIE_NAMES.accessToken, tokens.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expires_in,
  });
  cookieStore.set(COOKIE_NAMES.expiresAt, String(newExpiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expires_in,
  });

  if (tokens.refresh_token) {
    cookieStore.set(COOKIE_NAMES.refreshToken, tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAndPersistTokens(refreshToken: string): Promise<string | null> {
  try {
    const tokens = await refreshAccessToken(refreshToken);
    const cookieStore = await cookies();
    persistRefreshedTokens(cookieStore, tokens);
    return tokens.access_token;
  } catch {
    return null;
  }
}

async function refreshAccessTokenDeduped(
  refreshToken: string,
): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = refreshAndPersistTokens(refreshToken).finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function getValidAccessToken(
  forceRefresh = false,
): Promise<string | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_NAMES.accessToken)?.value;
  const refreshToken = cookieStore.get(COOKIE_NAMES.refreshToken)?.value;
  const expiresAt = cookieStore.get(COOKIE_NAMES.expiresAt)?.value;

  if (!refreshToken) return null;
  if (!accessToken && !forceRefresh) return null;

  const expiresAtMs = expiresAt ? Number.parseInt(expiresAt, 10) : 0;
  const isExpired = Date.now() >= expiresAtMs - 60_000;

  if (!forceRefresh && accessToken && !isExpired) return accessToken;

  return refreshAccessTokenDeduped(refreshToken);
}

interface SpotifyImage {
  url: string;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyAlbum {
  name: string;
  images: SpotifyImage[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
}

interface CurrentlyPlayingResponse {
  is_playing: boolean;
  progress_ms: number | null;
  item: SpotifyTrack | null;
}

export interface ParsedNowPlaying {
  trackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArt: string;
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
}

function isSpotifyUnauthorized(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("401") || error.message.includes("403"))
  );
}

export class SpotifyUnauthenticatedError extends Error {
  constructor() {
    super("unauthenticated");
    this.name = "SpotifyUnauthenticatedError";
  }
}

export async function fetchCurrentlyPlaying(
  accessToken: string,
): Promise<ParsedNowPlaying | null> {
  const response = await fetch(
    `${SPOTIFY_API_BASE}/me/player/currently-playing`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (response.status === 204 || response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }

  const data = (await response.json()) as CurrentlyPlayingResponse;
  if (!data.item) return null;

  return {
    trackId: data.item.id,
    trackName: data.item.name,
    artistName: data.item.artists.map((a) => a.name).join(", "),
    albumName: data.item.album.name,
    albumArt: data.item.album.images[0]?.url ?? "",
    progressMs: data.progress_ms ?? 0,
    durationMs: data.item.duration_ms,
    isPlaying: data.is_playing,
  };
}

export async function fetchCurrentlyPlayingWithAuth(): Promise<ParsedNowPlaying | null> {
  let accessToken = await getValidAccessToken();
  if (!accessToken) throw new SpotifyUnauthenticatedError();

  try {
    return await fetchCurrentlyPlaying(accessToken);
  } catch (error) {
    if (!isSpotifyUnauthorized(error)) throw error;

    accessToken = await getValidAccessToken(true);
    if (!accessToken) throw new SpotifyUnauthenticatedError();

    return fetchCurrentlyPlaying(accessToken);
  }
}
