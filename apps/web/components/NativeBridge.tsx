"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Handles a `gasamari://callback` deep link from the native OAuth flow.
 * Only an opaque one-time handoff code (or error flag) is in the URL;
 * the code is exchanged over HTTPS for HttpOnly session cookies that
 * land in this WebView. Tokens never travel in URLs.
 */
async function handleDeepLink(rawUrl: string): Promise<void> {
  let code: string | null = null;
  try {
    code = new URL(rawUrl).searchParams.get("code");
  } catch {
    code = null;
  }

  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    // Browser already closed (e.g. Android Custom Tab) — nothing to do.
  }

  window.location.assign(
    code
      ? `/api/auth/native/exchange?code=${encodeURIComponent(code)}`
      : "/?error=auth_failed",
  );
}

/**
 * Native-only glue between the Capacitor shell and the web UI.
 * No-ops in a regular browser.
 *
 * - Deep links (`gasamari://callback?...`): completes native OAuth.
 * - Android hardware back: navigate back in WebView history, otherwise
 *   minimize the app.
 */
export function NativeBridge(): null {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeUrlListener: (() => void) | undefined;
    let removeBackListener: (() => void) | undefined;
    let cancelled = false;

    void (async (): Promise<void> => {
      const { App } = await import("@capacitor/app");

      // App was cold-started by a deep link.
      const launch = await App.getLaunchUrl();
      if (launch?.url) {
        await handleDeepLink(launch.url);
        return;
      }

      const urlHandle = await App.addListener("appUrlOpen", ({ url }) => {
        void handleDeepLink(url);
      });
      const backHandle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          void App.minimizeApp();
        }
      });

      if (cancelled) {
        void urlHandle.remove();
        void backHandle.remove();
        return;
      }
      removeUrlListener = () => void urlHandle.remove();
      removeBackListener = () => void backHandle.remove();
    })();

    return () => {
      cancelled = true;
      removeUrlListener?.();
      removeBackListener?.();
    };
  }, []);

  return null;
}
