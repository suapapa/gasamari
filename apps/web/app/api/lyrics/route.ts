import { NextRequest, NextResponse } from "next/server";

function resolveLyricsApiBase(): string {
  return (
    process.env.API_BASE_URL?.replace(/\/$/, "") ||
    process.env.LYRICS_API_BASE_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:8000"
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const track = searchParams.get("track");
  const artist = searchParams.get("artist");
  const album = searchParams.get("album") ?? "";

  if (!track?.trim() || !artist?.trim()) {
    return NextResponse.json(
      { error: "missing_params" },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({ track, artist, album });
  const upstream = `${resolveLyricsApiBase()}/lyrics?${params.toString()}`;

  try {
    const res = await fetch(upstream, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json({ error: "lyrics_upstream_unreachable" }, { status: 502 });
  }
}
