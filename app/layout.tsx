import type { Metadata } from "next";
import localFont from "next/font/local";
import Nav from "@/components/Nav";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

// Self-hosted from public/fonts (no network access needed at build time).
const pressStart = localFont({
  src: "../public/fonts/Press_Start_2P/PressStart2P-Regular.ttf",
  weight: "400",
  variable: "--font-press-start",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: [
    {
      path: "../public/fonts/JetBrains_Mono/static/JetBrainsMono-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/JetBrains_Mono/static/JetBrainsMono-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/JetBrains_Mono/static/JetBrainsMono-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-jetbrains",
  display: "swap",
});

const courierPrime = localFont({
  src: [
    {
      path: "../public/fonts/Courier_Prime/CourierPrime-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Courier_Prime/CourierPrime-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-courier",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Online arcade platform for retro games and score leaderboards",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <html
      lang="en"
      className={`${pressStart.variable} ${jetbrainsMono.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="av-bg" aria-hidden="true" />
        <div className="av-noise" aria-hidden="true" />
        <div className="av-app">
          <Nav user={user} />
          {children}
          <footer className="av-footer">
            © 2026 ARCADE VAULT · MADE WITH PIXELS AND NEON · v2.6.0
          </footer>
        </div>
      </body>
    </html>
  );
}
