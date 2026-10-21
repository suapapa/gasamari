import type { CapacitorConfig } from "@capacitor/cli";

/**
 * GaSaMaRi native shell (Capacitor).
 *
 * The Next.js app uses SSR + API routes (Spotify OAuth cookies, lyrics
 * proxy), so it cannot be statically exported into the app bundle.
 * The native shell therefore loads the production deployment and
 * behaves as a first-class WebView app. All secrets stay on the server;
 * the app contains no Spotify client secret (PKCE + HttpOnly cookies
 * are handled by https://gsmr.homin.dev inside the WebView).
 *
 * Override the target for staging / LAN testing, e.g.:
 *   CAP_SERVER_URL=http://192.168.0.10:3000 pnpm cap:sync
 */
const serverUrl = process.env.CAP_SERVER_URL ?? "https://gsmr.homin.dev";

const config: CapacitorConfig = {
  appId: "dev.homin.gasamari",
  appName: "GaSaMaRi",
  // Only an offline fallback page is bundled; the real UI is served
  // by the production Next.js deployment configured below.
  webDir: "native-shell",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    allowNavigation: ["gsmr.homin.dev", "accounts.spotify.com", "*.spotify.com"],
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "always",
    allowsLinkPreview: false,
  },
};

export default config;
