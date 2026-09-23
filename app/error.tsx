"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

export default function VaultOffline({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="vault-offline fade-in" role="alert">
      <div className="vo-screen" aria-hidden="true">
        <div className="vo-static"></div>
        <div className="vo-signal pixel">NO SIGNAL</div>
      </div>
      <h1 className="vo-title pixel neon-magenta flicker">VAULT OFFLINE</h1>
      <p className="vo-copy">
        The game library and leaderboards could not be loaded. Wait a moment,
        then try again.
      </p>
      <div className="vo-actions">
        <button type="button" className="btn lg" onClick={() => retry()}>
          TRY AGAIN
        </button>
        <Link href="/" className="btn ghost lg">
          BACK TO VAULT
        </Link>
      </div>
    </div>
  );
}
