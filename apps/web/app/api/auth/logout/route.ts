import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/spotify";

export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAMES.accessToken);
  cookieStore.delete(COOKIE_NAMES.refreshToken);
  cookieStore.delete(COOKIE_NAMES.expiresAt);
  cookieStore.delete(COOKIE_NAMES.codeVerifier);

  return NextResponse.json({ ok: true });
}
