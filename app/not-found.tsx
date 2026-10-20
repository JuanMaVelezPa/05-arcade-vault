import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not found · Arcade Vault" };

export default function NotFound() {
  return (
    <div className="vault-offline fade-in">
      <div className="vo-screen" aria-hidden="true">
        <div className="vo-static"></div>
        <div className="vo-signal pixel">404</div>
      </div>
      <h1 className="vo-title pixel neon-magenta flicker">NOT IN THE VAULT</h1>
      <p className="vo-copy">
        That page or game does not exist, or it is no longer on the shelf.
      </p>
      <div className="vo-actions">
        <Link href="/" className="btn lg">
          BACK TO VAULT
        </Link>
      </div>
    </div>
  );
}
