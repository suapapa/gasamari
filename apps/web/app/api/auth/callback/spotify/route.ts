import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_NAMES,
  exchangeCodeForTokens,
  resolveAppOrigin,
  resolveRedirectUri,
} from "@/lib/spotify";

const TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

function redirectToApp(origin: string, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, origin));
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

  if (error) {
    return redirectToApp(origin, "/?error=auth_denied");
  }

  if (!code) {
    return redirectToApp(origin, "/?error=missing_code");
  }

  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get(COOKIE_NAMES.codeVerifier)?.value;

  if (!codeVerifier) {
    return redirectToApp(origin, "/?error=missing_verifier");
  }

  try {
    const redirectUri = resolveRedirectUri(origin);
    const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);
    const expiresAt = Date.now() + tokens.expires_in * 1_000;

    const response = redirectToApp(origin, "/");

    response.cookies.set(COOKIE_NAMES.accessToken, tokens.access_token, {
      ...TOKEN_COOKIE_OPTIONS,
      maxAge: tokens.expires_in,
    });
    response.cookies.set(COOKIE_NAMES.expiresAt, String(expiresAt), {
      ...TOKEN_COOKIE_OPTIONS,
      maxAge: tokens.expires_in,
    });

    if (tokens.refresh_token) {
      response.cookies.set(COOKIE_NAMES.refreshToken, tokens.refresh_token, {
        ...TOKEN_COOKIE_OPTIONS,
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    response.cookies.delete(COOKIE_NAMES.codeVerifier);

    return response;
  } catch {
    return redirectToApp(origin, "/?error=token_exchange");
  }
}
