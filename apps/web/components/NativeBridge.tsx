"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Native-only glue between the Capacitor shell and the web UI.
 * No-ops in a regular browser.
 *
 * - Android hardware back: navigate back in WebView history, otherwise
 *   let the OS handle it (background/exit).
 * - Deep links (`gasamari://...`, reserved for a future system-browser
 *   OAuth flow): bring the user back to the home screen. Tokens are
 *   never passed through URLs.
 */
export function NativeBridge(): null {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeUrlListener: (() => void) | undefined;
    let removeBackListener: (() => void) | undefined;
    let cancelled = false;

    void (async (): Promise<void> => {
      const { App } = await import("@capacitor/app");

      const urlHandle = await App.addListener("appUrlOpen", () => {
        window.location.assign("/");
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
