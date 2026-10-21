"use client";

import { Capacitor } from "@capacitor/core";
import { LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpotifyLoginButtonProps {
  isAuthenticated: boolean;
  className?: string;
}

export function SpotifyLoginButton({
  isAuthenticated,
  className,
}: SpotifyLoginButtonProps) {
  const handleClick = async () => {
    if (isAuthenticated) {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.reload();
      return;
    }
    if (Capacitor.isNativePlatform()) {
      // Embedded WebViews cannot complete Google/social login, and any
      // cookies set there never reach this WebView. Run OAuth in the
      // system browser instead; the server returns via a `gasamari://`
      // deep link and NativeBridge exchanges the handoff code here.
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({
        url: `${window.location.origin}/api/auth/login?native=1`,
      });
      return;
    }

    window.location.href = "/api/auth/login";
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full px-5 py-2.5",
        "bg-accent/10 text-accent border border-accent/30",
        "transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
      aria-label={isAuthenticated ? "Log out of Spotify" : "Log in with Spotify"}
    >
      {isAuthenticated ? (
        <>
          <LogOut className="size-4" aria-hidden />
          <span className="text-sm font-medium">Logout</span>
        </>
      ) : (
        <>
          <LogIn className="size-4" aria-hidden />
          <span className="text-sm font-medium">Connect Spotify</span>
        </>
      )}
    </button>
  );
}
