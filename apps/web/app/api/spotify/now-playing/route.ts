import { NextResponse } from "next/server";
import {
  fetchCurrentlyPlayingWithAuth,
  SpotifyUnauthenticatedError,
} from "@/lib/spotify";

export async function GET(): Promise<NextResponse> {
  try {
    const track = await fetchCurrentlyPlayingWithAuth();
    return NextResponse.json({ track });
  } catch (error) {
    if (error instanceof SpotifyUnauthenticatedError) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    return NextResponse.json({ error: "spotify_error" }, { status: 502 });
  }
}
