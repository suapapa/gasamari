import { NextRequest, NextResponse } from "next/server";
import { consumeAuthHandoff } from "@/lib/authHandoff";
import { applySessionCookies, resolveAppOrigin } from "@/lib/spotify";

/**
 * Exchanges a one-time native OAuth handoff code for the usual HttpOnly
 * session cookies. This request runs in the app WebView, so the cookies
 * land in the WebView's own cookie jar. Codes are single-use and expire
 * after 2 minutes (see lib/authHandoff.ts).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");

  // Never redirect to request.nextUrl.origin: behind Docker/reverse
  // proxies that can be the bind address (0.0.0.0:3000). Resolve the
  // configured public origin instead (same helper as the callback).
  let origin: string;
  try {
    origin = resolveAppOrigin(request);
  } catch {
    return NextResponse.json(
      { error: "Cannot resolve public app origin." },
      { status: 500 },
    );
  }

  const session = code ? consumeAuthHandoff(code) : null;
  if (!session) {
    return NextResponse.redirect(new URL("/?error=handoff_expired", origin));
  }

  const response = NextResponse.redirect(new URL("/", origin));
  applySessionCookies(response, session);
  return response;
}
