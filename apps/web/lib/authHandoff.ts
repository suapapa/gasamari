import crypto from "crypto";

/**
 * One-time handoff codes for native (Capacitor) OAuth.
 *
 * Flow: Spotify callback runs in the system browser / Custom Tab, where
 * the WebView cannot see the resulting cookies. Instead of putting any
 * token in a URL, the callback stores the tokens server-side and hands
 * the app an opaque, single-use code via the `gasamari://` deep link.
 * The app WebView then exchanges that code (over HTTPS, same origin)
 * and receives the usual HttpOnly cookies in its own cookie jar.
 *
 * Codes live only in this process's memory: at most 5 minutes, single
 * use, and never logged. Suitable for the single-instance deployment;
 * if the web tier is ever scaled out, move this to shared storage.
 */

export interface HandoffTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface HandoffEntry {
  tokens: HandoffTokens;
  createdAt: number;
}

const HANDOFF_TTL_MS = 120_000;

type GlobalWithHandoffs = typeof globalThis & {
  __gasamariAuthHandoffs?: Map<string, HandoffEntry>;
};

function handoffStore(): Map<string, HandoffEntry> {
  const global = globalThis as GlobalWithHandoffs;
  global.__gasamariAuthHandoffs ??= new Map<string, HandoffEntry>();
  return global.__gasamariAuthHandoffs;
}

function pruneExpired(store: Map<string, HandoffEntry>, now: number): void {
  for (const [code, entry] of store) {
    if (now - entry.createdAt > HANDOFF_TTL_MS) {
      store.delete(code);
    }
  }
}

export function createAuthHandoff(tokens: HandoffTokens): string {
  const store = handoffStore();
  const now = Date.now();
  pruneExpired(store, now);

  const code = crypto.randomBytes(32).toString("base64url");
  store.set(code, { tokens, createdAt: now });
  return code;
}

/** Returns the tokens exactly once; expired/unknown codes return null. */
export function consumeAuthHandoff(code: string): HandoffTokens | null {
  const store = handoffStore();
  const entry = store.get(code);
  if (!entry) return null;

  store.delete(code);
  if (Date.now() - entry.createdAt > HANDOFF_TTL_MS) return null;
  return entry.tokens;
}
