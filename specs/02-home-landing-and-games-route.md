# 02 — Home Landing Page & Games Route

**State:** Implemented
**Depends on:** 01-mvp-screens
**Date:** 2026-09-21

**Objective:** Add a marketing-style Home landing page as the app's default route (`/`) per `references/templates/home-about/home.jsx`, moving the existing game-grid screen from `/` to `/games`.

## Scope

### In scope

- A new Home landing screen at `/`, ported from `references/templates/home-about/home.jsx`, with its sections: hero (with floating pixel silhouettes), "Why Arcade Vault" feature grid, a 6-game preview rail, stats block, live-activity panel (recent scores ticker + top players list, static mock data as in the template), and a pricing/FAQ section.
- Moving the current Library screen (search + category chips + full game grid) from `app/page.tsx` to `app/games/page.tsx`, unchanged in behavior.
- Porting the CSS needed for the new Home sections (`.home-hero`, `.home-silos`, `.feature-grid`, `.mini-rail`, `.home-stats`, `.activity-grid`, `.pricing-grid`, `.home-final`, `.reveal`/scroll-reveal, and their existing media queries) from `references/templates/home-about/styles.css` into `app/globals.css`, matching the near-verbatim porting approach used in spec 01. No Tailwind rebuild.
- Updating `components/Nav.tsx`: add a "Home" link (`/`, active only on exact `/`) and rename the existing "Library" link to "Games" pointing at `/games` (active on `/games`, `/game/[id]`, `/player/[id]`), in both the desktop nav and the mobile panel. Keep the existing "Hall of Fame" link and the static credits counter as-is.
- Translating all Home-section copy from Spanish to English, matching the convention set in spec 01.
- Home page CTAs and links that in the template point at auth or account creation ("CREAR CUENTA", pricing section's "EMPEZAR GRATIS →") are repointed to `/games` instead, since there is no account system. Game preview cards and "explore/see all games" CTAs link to `/game/[id]` and `/games` respectively, matching current app behavior.
- The scroll-reveal effect (`IntersectionObserver` adding an `in` class to `.reveal` elements) ported as a small hook/effect local to the Home component, matching `useReveal()` in the template.

### Not in scope

- `references/templates/home-about/about.jsx` (About + Contact page) and any `/about` route — deferred to a future spec.
- `references/templates/home-about/nav.jsx`'s "Acerca de" (About) link and "Iniciar Sesión" (Sign In) button — not added, since there is no About page or Auth in this app.
- The Auth screen and any session/account state — still out of scope, per spec 01.
- Wiring the Home page's "live activity" ticker or "top players" list to real data — both stay static mock arrays ported from the template, exactly as the template itself does (it is not connected to `seededScores` or `localStorage` either).
- Any change to `/game/[id]`, `/player/[id]`, or `/hall-of-fame` beyond the Nav link update.
- Redirects or backwards-compatible aliases from the old `/` (Library) behavior — `/` now always renders Home; anyone wanting the grid uses `/games` or the Nav/CTA links.

## Data model

No new persisted data structures. The Home page's "recent scores" ticker and "top players" list are static, hardcoded display arrays local to the Home component (translated copy of the template's inline mock arrays) — not read from `lib/data.ts` or `localStorage`. The 6-game preview rail reads from the existing `GAMES` array in `lib/data.ts` (`GAMES.slice(0, 6)`), using the existing `Game` type's `title`, `cover`, and `category` fields (`category` instead of the template's `cat`).

## Implementation plan

1. **Move the Library screen** — create `app/games/page.tsx` with the exact current contents of `app/page.tsx` (search, chips, grid). System still builds; `/games` now shows what `/` used to show, `/` is temporarily unchanged (still old content) until step 3.
2. **Port Home CSS** — append the ported/translated selectors listed in scope (hero, silhouettes, feature grid, mini-rail, stats, activity, pricing, final CTA, reveal animation, and their media queries) to `app/globals.css`. No visual change yet since nothing references these classes.
3. **Build the Home component** — replace `app/page.tsx` with the new Home screen: hero with `FloatingSilhouettes`, feature grid, `GAMES.slice(0, 6)` preview rail (routing to `/game/[id]`), stats block, activity section (static ticker + top players, "See Hall of Fame" linking to `/hall-of-fame`), pricing/FAQ section (CTA → `/games`), final CTA (→ `/games`). All copy in English. `/` now shows the new landing page; `/games` shows the grid.
4. **Update Nav** — add "Home" link and rename "Library" to "Games" (→ `/games`) in `components/Nav.tsx`, desktop and mobile panel, with corrected active-state logic.
5. **Responsive & visual QA pass** — run `npm run dev`, then use the Playwright MCP tools to drive `/` and `/games` (navigate, resize to desktop and mobile widths, click through CTAs and Nav links, screenshot) at desktop and mobile widths (existing breakpoints plus the Home section's own: 980px/520px feature grid, 1100px/600px mini-rail, 720px stats/activity, 900px pricing), and compare against `references/templates/home-about/arcade-vault-standalone.html` for visual parity on the Home sections.

## Acceptance criteria

- [x] Visiting `/` shows the new Home landing page (hero, "why us" feature grid, 6-game preview rail, stats block, activity section, pricing/FAQ, final CTA) instead of the game grid.
- [x] Visiting `/games` shows the search box, category chips, and full game grid — identical behavior to what `/` had before this spec (search filters by title, chip filters by category, "no results" empty state works).
- [x] The Home hero's primary CTA and the "See all games" / final CTA buttons navigate to `/games`; the pricing section's CTA also navigates to `/games` (not `/auth`).
- [x] The 6 preview cards on the Home page navigate to `/game/[id]` for their respective game.
- [x] The Nav shows "Home" (→ `/`, active only on exact `/`) and "Games" (→ `/games`, active on `/games`, `/game/[id]`, `/player/[id]`) in both desktop and mobile layouts; "Hall of Fame" still works as before.
- [x] Scrolling the Home page triggers the reveal-in animation on each `.reveal` section.
- [x] All Home-page copy is in English.
- [x] There is no `/about` route and no About/Sign-In links in the Nav.
- [x] The Home page is usable at desktop and mobile widths without horizontal overflow.
- [x] `npm run build` completes with no type errors.

## Decisions taken and discarded

- **`/` becomes Home, `/games` becomes the game grid** — explicit user decision; no redirect or alias is kept for the old `/` = grid behavior, since this is pre-launch and there are no external links to preserve.
- **`about.jsx` excluded from this spec** — the user's own instruction flagged `references/templates/home-about/` as out of scope alongside asking for the homepage from that same folder; resolved by scoping this spec to `home.jsx` only and deferring `about.jsx` (a distinct screen — Contact form + mission statement) to its own future spec, rather than guessing which parts of a two-page folder were meant.
- **Nav gets "Home" + "Games" only, no "About" or "Sign In"** — matches the app's existing no-auth stance from spec 01; the template's `nav.jsx` (which does add both) is not used as the Nav reference, since it belongs to the descoped about/auth surface.
- **Auth-pointing CTAs on Home are repointed to `/games`, not removed or left as no-ops** — keeps every button on the page purposeful and testable, avoids visually "dead" buttons, and nudges guests toward the one signup-free flow that exists (playing games).
- **Home's ticker/top-players data stays static mock data**, not wired to `seededScores` or `localStorage` — matches the template's own behavior (it doesn't wire this either) and keeps this spec scoped to layout/visual work, not a new leaderboard aggregation feature.
- **CSS ported near-verbatim into `app/globals.css`**, no Tailwind rebuild — consistent with the approach already established and justified in spec 01.
- **QA for the new `/` and `/games` pages uses the Playwright MCP tools**, not just manual dev-server eyeballing — explicit user instruction, gives a repeatable, scriptable way to check both routes across viewport widths and CTA/Nav navigation.
