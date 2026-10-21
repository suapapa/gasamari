import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createAuthHandoff } from "@/lib/authHandoff";
import {
  applySessionCookies,
  COOKIE_NAMES,
  exchangeCodeForTokens,
  resolveAppOrigin,
  resolveRedirectUri,
} from "@/lib/spotify";

function redirectToApp(origin: string, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, origin));
}

/**
 * Returns the user to the native app. Only an opaque one-time handoff
 * code (or an error flag) travels in the deep link — never tokens.
 */
function redirectToNativeApp(params: Record<string, string>): NextResponse {
  const url = new URL("gasamari://callback");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  let origin: string;
  try {
    origin = resolveAppOrigin(request);
  } catch {
    return NextResponse.json(
      {
        error:
          "Cannot resolve public app origin. Set APP_URL or SPOTIFY_REDIRECT_URI.",
      },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const isNative = cookieStore.get(COOKIE_NAMES.oauthNative)?.value === "1";

  if (error) {
    return isNative
      ? redirectToNativeApp({ error: "auth_denied" })
      : redirectToApp(origin, "/?error=auth_denied");
  }

  if (!code) {
    return isNative
      ? redirectToNativeApp({ error: "missing_code" })
      : redirectToApp(origin, "/?error=missing_code");
  }

  const codeVerifier = cookieStore.get(COOKIE_NAMES.codeVerifier)?.value;

  if (!codeVerifier) {
    return isNative
      ? redirectToNativeApp({ error: "missing_verifier" })
      : redirectToApp(origin, "/?error=missing_verifier");
  }

  try {
    const redirectUri = resolveRedirectUri(origin);
    const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);
    const expiresAt = Date.now() + tokens.expires_in * 1_000;

    if (isNative) {
      const handoffCode = createAuthHandoff({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      });
      const response = redirectToNativeApp({ code: handoffCode });
      response.cookies.delete(COOKIE_NAMES.codeVerifier);
      response.cookies.delete(COOKIE_NAMES.oauthNative);
      return response;
    }

    const response = redirectToApp(origin, "/");
    applySessionCookies(response, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    });
    response.cookies.delete(COOKIE_NAMES.codeVerifier);

    return response;
  } catch {
    return isNative
      ? redirectToNativeApp({ error: "token_exchange" })
      : redirectToApp(origin, "/?error=token_exchange");
  }
}
