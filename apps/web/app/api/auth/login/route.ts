import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthUrl,
  COOKIE_NAMES,
  generateCodeChallenge,
  generateCodeVerifier,
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
  const redirectUri = resolveRedirectUri(request.nextUrl.origin);

  const authUrl = buildAuthUrl(state, challenge, redirectUri);
  const response = NextResponse.redirect(authUrl);
  response.cookies.set(COOKIE_NAMES.codeVerifier, verifier, PKCE_COOKIE_OPTIONS);

  return response;
}
