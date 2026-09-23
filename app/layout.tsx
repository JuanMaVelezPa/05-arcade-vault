import type { Metadata } from "next";
import localFont from "next/font/local";
import Nav from "@/components/Nav";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pressStart.variable} ${jetbrainsMono.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="av-bg" aria-hidden="true" />
        <div className="av-noise" aria-hidden="true" />
        <div className="av-app">
          <Nav />
          {children}
          <footer
            style={{
              borderTop: "1px solid var(--line)",
              padding: "20px 32px",
              textAlign: "center",
              color: "var(--ink-faint)",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
            }}
          >
            © 2026 ARCADE VAULT · MADE WITH PIXELS AND NEON · v2.6.0
          </footer>
        </div>
      </body>
    </html>
  );
}
