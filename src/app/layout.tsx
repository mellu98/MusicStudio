import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import PwaRegister from "./components/PwaRegister";
import { Analytics } from "@vercel/analytics/react";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: {
    default: "Suno Pocket Studio",
    template: "%s | Suno Pocket Studio"
  },
  description: "PWA semplice per generare brani con Suno API, ascoltare i risultati e portarli sul telefono.",
  keywords: ["suno", "music generator", "pwa", "next.js", "suno api", "ai music"],
  applicationName: "Suno Pocket Studio",
  creator: "@gcui.ai",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pocket Studio"
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icon-192.png" }],
    shortcut: ["/icon-192.png"]
  }
};

export const viewport: Viewport = {
  themeColor: "#12312a",
  colorScheme: "light"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${manrope.variable} overflow-y-scroll`}>
        <PwaRegister />
        <Header />
        <main className="flex min-h-[calc(100vh-152px)] w-full flex-col items-center m-auto">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
