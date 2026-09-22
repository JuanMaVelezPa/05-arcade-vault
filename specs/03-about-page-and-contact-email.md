# 03 — About Page & Contact Email

**State:** Approved
**Depends on:** 02-home-landing-and-games-route
**Date:** 2026-09-21

**Objective:** Add an `/about` route (mission statement + contact form) ported from `references/templates/home-about/about.jsx`, wired to a real backend that sends the submitted message as an email via Resend.

## Scope

### In scope

- A new About screen at `/about`, ported from `references/templates/home-about/about.jsx`: hero (mission statement + 3-item highlight row), a pixel divider banner, and a contact section (intro + tips list + form).
- Porting the CSS needed for the About page (`.about-hero`, `.highlight-row`/`.highlight`, `.about-divider`/`.div-bar`/`.div-pixels`, `.about-contact`/`.contact-grid`/`.contact-intro`/`.contact-tips`, `.contact-form` and its fields/shake animation, `.terminal-success` and its `.term-bar`/`.term-body` children) from `references/templates/home-about/styles.css` into `app/globals.css`, near-verbatim as in specs 01/02. `.reveal`/`.reveal.in` is already ported (spec 02) and reused as-is.
- A real POST endpoint at `app/api/contact/route.ts` that validates the payload server-side and sends the message via the Resend SDK.
- Adding the `resend` package as a dependency.
- `RESEND_API_KEY` read from `process.env` server-side only; a `.env.example` file documenting the variable (placeholder value, not a real key); `.env.local` (gitignored, already covered by Next.js's default `.gitignore`) holds the real key locally and is never committed.
- Client-side form behavior on top of the template's: in addition to the existing non-empty check, the email field is validated as a well-formed address (regex) before submit — invalid input triggers the existing shake animation instead of submitting.
- A submitting/loading state on the submit button while the request is in flight.
- A new terminal-style **error** state (visually consistent with the existing `.terminal-success` block, red/warning accent instead of green) shown when the API call fails (network error, non-2xx response, or a JSON error body), with a "try again" action that returns to the form **with the previously typed values intact** (name/email/message are not cleared).
- Adding an "About" link (→ `/about`) to `components/Nav.tsx`, in both the desktop `.links` row and the mobile `.av-mobile-panel`, active on `/about`. No Sign In / auth link is added — the app remains guest-only per specs 01/02.
- Translating all About-page copy (hero, highlights, contact intro/tips, form labels/placeholders, terminal success/error lines) from Spanish to English, matching the convention set in specs 01/02.

### Not in scope

- `references/templates/home-about/nav.jsx`'s "Iniciar Sesión" (Sign In) button — still not added; there is no Auth screen or session state (per spec 01).
- Any spam/abuse protection (honeypot field, rate limiting, CAPTCHA) — the form is submitted directly to the API route with only the validation described above.
- Persisting contact messages anywhere (database, file, `localStorage`) — a message either gets emailed successfully or the user sees the error state; nothing is stored server-side.
- A verified custom sending domain in Resend — this spec uses Resend's shared sandbox sender (`onboarding@resend.dev`); moving to a verified domain (e.g. an `@arcadevault.*` address) is a future, ops-only change and does not require new application code.
- Any change to `/`, `/games`, `/game/[id]`, `/player/[id]`, or `/hall-of-fame` beyond the Nav link addition.
- Internationalization / language switching — the app stays English-only, same as specs 01/02.

## Data model

No new persisted data structures (nothing saved to `localStorage` or a database). New request/response shapes, used only in-memory for the API call:

- **`app/api/contact/route.ts`** (POST handler)
  - Request body: `{ name: string; email: string; message: string }`.
  - Server-side validation: all three fields non-empty (trimmed), `email` matches a basic email regex. A failing validation returns `400` with `{ error: string }`.
  - On success: calls the Resend SDK to send an email with:
    - `to`: `"juanmavelezpa1@gmail.com"`
    - `from`: `"Arcade Vault <onboarding@resend.dev>"`
    - `reply_to`: the submitter's `email`, so replying goes directly to them
    - `subject`: `` `New Arcade Vault contact message from ${name}` ``
    - `text` (or `html`): includes `name`, `email`, and `message` in a plain, readable layout
  - Returns `200` with `{ ok: true }` on success; `500` with `{ error: string }` if the Resend call throws or Resend reports failure (including a missing/invalid `RESEND_API_KEY`).
- **`.env.example`** — new file at the repo root with `RESEND_API_KEY=` and a comment pointing to where to generate one (Resend dashboard), no real value committed.

## Implementation plan

1. **Add the dependency & env scaffolding** — `npm install resend`; add `.env.example` with `RESEND_API_KEY=` (placeholder); confirm `.env.local` is covered by the existing `.gitignore` (Next.js's default template already ignores `.env*.local`). System still builds and runs unchanged.
2. **Build the API route** — add `app/api/contact/route.ts`: parse and validate the JSON body, instantiate the Resend client with `process.env.RESEND_API_KEY`, send the email with the fields above, and return the success/error JSON responses described in the data model. Testable independently via `curl`/Playwright network calls before the UI exists.
3. **Port About CSS** — append the ported/translated selectors listed in scope (hero, highlight row, divider, contact grid/intro/tips, contact form + shake, terminal success, plus the new terminal error variant) to `app/globals.css`. No visual change yet since nothing references these classes.
4. **Build the About page** — add `app/about/page.tsx` as a client component: hero + highlight row, divider banner, contact section with the form. Form state machine: `idle/editing` → (submit) → `submitting` → `success` | `error`. Client-side validation (non-empty + email format) gates the API call; on `error`, the "try again" button returns to `editing` with the typed values preserved; on `success`, shows the existing terminal-success block (with a "send another message" action that resets the form, matching the template). All copy in English.
5. **Update Nav** — add the "About" link (→ `/about`) to `components/Nav.tsx`, desktop and mobile panel, with active-state logic for `pathname === "/about"`.
6. **Responsive & visual QA pass** — run `npm run dev`, then use the Playwright MCP tools to drive `/about`: submit a valid message and confirm the success terminal appears (with a valid `RESEND_API_KEY` configured), submit with an invalid email and confirm the shake fires without a network call, and force an error path (e.g. temporarily unset/break the API key) to confirm the error terminal appears and "try again" preserves the typed values. Check desktop and mobile widths (existing 900px `.contact-grid` breakpoint and 820px `.highlight-row` breakpoint) against `references/templates/home-about/arcade-vault-standalone.html` for visual parity. Confirm the Nav's "About" link and active state on both layouts.

## Acceptance criteria

- [ ] Visiting `/about` shows the hero (mission statement + 3 highlights), the pixel divider, and the contact section (intro + tips + form).
- [ ] Submitting the form with valid, non-empty fields and a well-formed email sends a real email via Resend to `juanmavelezpa1@gmail.com` (from the sandbox sender, with `reply_to` set to the submitter's email) and shows the terminal-success block with the submitter's name.
- [ ] Submitting with any field empty triggers the shake animation and does not call the API, matching the template's existing behavior.
- [ ] Submitting with a non-empty but malformed email triggers the shake animation and does not call the API.
- [ ] While the request is in flight, the submit button shows a loading/disabled state.
- [ ] If the API call fails (bad/missing `RESEND_API_KEY`, network error, or Resend error response), a terminal-style error state appears instead of success, and its "try again" action returns to the form with the previously typed name/email/message still filled in.
- [ ] `app/api/contact/route.ts` rejects requests with empty fields or a malformed email with a `400` response, independent of the client-side checks.
- [ ] The Nav shows "About" (→ `/about`, active only on `/about`) in both desktop and mobile layouts; no Sign In link is present anywhere.
- [ ] All About-page copy (including the new error state) is in English.
- [ ] The About page is usable at desktop and mobile widths without horizontal overflow.
- [ ] `RESEND_API_KEY` is read only in server-side code (the API route), never exposed to the client bundle.
- [ ] `.env.example` exists documenting `RESEND_API_KEY`; no real API key is committed anywhere in the repo.
- [ ] `npm run build` completes with no type errors.

## Decisions taken and discarded

- **Resend's shared sandbox sender (`onboarding@resend.dev`)**, not a custom verified domain — explicit user decision; a custom domain needs DNS/ops work outside this spec's scope and can be swapped in later by changing one string in the API route.
- **Server-side validation added even though the client already validates** — the API route is a real network endpoint; relying on client-side checks alone would let anyone POST garbage directly to it.
- **A new terminal-style error state, not a silent failure** — the template never calls a real backend so it has no failure path; since this spec makes the call real, a failure the user can see and recover from (without losing their typed message) was chosen over silently swallowing errors or leaving the button spinning forever.
- **No spam protection (honeypot/rate limit/CAPTCHA)** — kept out of scope to match this spec's narrow goal (get email sending working); can be layered on in a future spec if abuse becomes a real concern.
- **No persistence of contact messages** — matches the "visuals + one real integration" scope of this spec; adding a message log/database is a separate concern with its own data-model questions (retention, PII handling) better suited to its own spec.
- **Nav gets "About" only, no "Sign In"** — consistent with the no-auth stance from specs 01/02; only the piece of `nav.jsx` this spec's screen actually needs is added.
- **All About-page copy translated to English**, including the new error state — matches the established convention from specs 01/02.

## Identified risks

- **Missing/invalid `RESEND_API_KEY` in any environment** (e.g. a fresh clone, or Vercel deploy without the env var set) will make every submission hit the error path — acceptable since it fails visibly and recoverably, but `.env.example` and the acceptance criteria call this out explicitly so it isn't missed at setup time.
- **Resend sandbox sender limitations:** the shared `onboarding@resend.dev` sender may be subject to Resend account-level sending limits or spam-filtering on the receiving side; if `juanmavelezpa1@gmail.com` doesn't receive test emails, check Resend's dashboard logs before assuming the integration is broken.
