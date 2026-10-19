"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { signOut } from "@/app/actions/auth";
import type { CurrentUser } from "@/lib/auth";

const AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

export default function Nav({ user }: { user: CurrentUser | null }) {
  const [open, setOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  const isHomeActive = pathname === "/";
  const isGamesActive =
    pathname === "/games" ||
    pathname.startsWith("/game/") ||
    pathname.startsWith("/player/");
  const isHallActive = pathname === "/hall-of-fame";
  const isAboutActive = pathname === "/about";

  const close = () => setOpen(false);

  // Return to the current page after logging in, except from the auth pages
  const loginHref = AUTH_PATHS.includes(pathname)
    ? "/login"
    : `/login?next=${encodeURIComponent(pathname)}`;

  function onSignOut() {
    close();
    startSignOut(async () => {
      const res = await signOut();
      if (res.ok) router.refresh();
    });
  }

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
          <Link href="/about" className={isAboutActive ? "active" : ""}>
            About
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CREDITS · 03</span>
        </div>
        {user ? (
          <div className="nav-user">
            <span className="nav-username" title={user.email}>
              {user.username}
            </span>
            <button
              type="button"
              className="btn ghost"
              onClick={onSignOut}
              disabled={signingOut}
            >
              SIGN OUT
            </button>
          </div>
        ) : (
          <Link href={loginHref} className="btn auth-btn nav-login">
            LOGIN
          </Link>
        )}
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menu"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENU
        </div>
        <Link href="/" className={isHomeActive ? "active" : ""} onClick={close}>
          Home
        </Link>
        <Link
          href="/games"
          className={isGamesActive ? "active" : ""}
          onClick={close}
        >
          Games
        </Link>
        <Link
          href="/hall-of-fame"
          className={isHallActive ? "active" : ""}
          onClick={close}
        >
          Hall of Fame
        </Link>
        <Link
          href="/about"
          className={isAboutActive ? "active" : ""}
          onClick={close}
        >
          About
        </Link>
        <div style={{ flex: 1 }}></div>
        {user ? (
          <>
            <div className="panel-user" title={user.email}>
              {user.username}
            </div>
            <button
              type="button"
              className="panel-link"
              onClick={onSignOut}
              disabled={signingOut}
            >
              SIGN OUT
            </button>
          </>
        ) : (
          <Link href={loginHref} onClick={close}>
            LOGIN
          </Link>
        )}
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CREDITS · 03
        </div>
      </aside>
    </>
  );
}
