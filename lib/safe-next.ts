// Pure helper (no server-only) so the proxy can use it too
const DEFAULT_NEXT = "/games";

// Only same-origin relative paths are allowed; anything else is an open redirect
export function safeNext(next: string | null | undefined): string {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    /[\u0000-\u001f]/.test(next)
  ) {
    return DEFAULT_NEXT;
  }
  return next;
}
