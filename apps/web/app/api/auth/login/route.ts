import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthUrl,
  COOKIE_NAMES,
  generateCodeChallenge,
  generateCodeVerifier,
  resolveRedirectUri,
} from "@/lib/spotify";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = resolveRedirectUri(request.nextUrl.origin);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.codeVerifier, verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const authUrl = buildAuthUrl(state, challenge, redirectUri);
  return NextResponse.redirect(authUrl);
}
