"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isHomeActive = pathname === "/";
  const isGamesActive = pathname === "/games" || pathname.startsWith("/game/") || pathname.startsWith("/player/");
  const isHallActive = pathname === "/hall-of-fame";

  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isHomeActive ? "active" : ""}>
            Home
          </Link>
          <Link href="/games" className={isGamesActive ? "active" : ""}>
            Games
          </Link>
          <Link href="/hall-of-fame" className={isHallActive ? "active" : ""}>
            Hall of Fame
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CREDITS · 03</span>
        </div>
        <button type="button" className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menu">
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close}></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENU
        </div>
        <Link href="/" className={isHomeActive ? "active" : ""} onClick={close}>
          Home
        </Link>
        <Link href="/games" className={isGamesActive ? "active" : ""} onClick={close}>
          Games
        </Link>
        <Link href="/hall-of-fame" className={isHallActive ? "active" : ""} onClick={close}>
          Hall of Fame
        </Link>
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CREDITS · 03
        </div>
      </aside>
    </>
  );
}
