import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES, exchangeCodeForTokens, resolveRedirectUri } from "@/lib/spotify";

const TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/?error=auth_denied", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", request.url));
  }

  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get(COOKIE_NAMES.codeVerifier)?.value;

  if (!codeVerifier) {
    return NextResponse.redirect(new URL("/?error=missing_verifier", request.url));
  }

  try {
    const redirectUri = resolveRedirectUri(request.nextUrl.origin);
    const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);
    const expiresAt = Date.now() + tokens.expires_in * 1_000;

    const response = NextResponse.redirect(new URL("/", request.url));

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
    return NextResponse.redirect(new URL("/?error=token_exchange", request.url));
  }
}
