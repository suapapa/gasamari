import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/spotify";

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const isAuthenticated = Boolean(
    cookieStore.get(COOKIE_NAMES.accessToken)?.value &&
      cookieStore.get(COOKIE_NAMES.refreshToken)?.value,
  );

  return NextResponse.json({ authenticated: isAuthenticated });
}
