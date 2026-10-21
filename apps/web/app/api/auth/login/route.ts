import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthUrl,
  COOKIE_NAMES,
  generateCodeChallenge,
  generateCodeVerifier,
  resolveAppOrigin,
  resolveRedirectUri,
} from "@/lib/spotify";

const PKCE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600,
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = crypto.randomBytes(16).toString("hex");
  const origin = resolveAppOrigin(request);
  const redirectUri = resolveRedirectUri(origin);
  // Native apps start OAuth in the system browser (`?native=1`) so that
  // Google/social login is not trapped in an embedded WebView. The flag
  // rides along in a cookie (same browser) to the Spotify callback,
  // which then returns to the app via a deep-link handoff.
  const isNative = request.nextUrl.searchParams.get("native") === "1";

  const authUrl = buildAuthUrl(state, challenge, redirectUri);
  const response = NextResponse.redirect(authUrl);
  response.cookies.set(COOKIE_NAMES.codeVerifier, verifier, PKCE_COOKIE_OPTIONS);
  if (isNative) {
    response.cookies.set(COOKIE_NAMES.oauthNative, "1", PKCE_COOKIE_OPTIONS);
  }

  return response;
}
