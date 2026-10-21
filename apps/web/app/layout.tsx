import type { Metadata, Viewport } from "next";
import { Poppins, Righteous } from "next/font/google";
import { NativeBridge } from "@/components/NativeBridge";
import "./globals.css";

const righteous = Righteous({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-righteous",
});

const poppins = Poppins({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Gasamari — Synced Lyrics Visualizer",
  description:
    "Real-time synced lyrics visualizer for your currently playing Spotify track.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f0f23",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${righteous.variable} ${poppins.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-background text-foreground">
        <NativeBridge />
        {children}
      </body>
    </html>
  );
}
