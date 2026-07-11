# TWP build day — HANDOFF
**Date:** 2026-07-11 · **Branch:** `claude/redesign-website-iubYk` · **Live:** https://dev.thosewhoplay.com (basic-auth)

## What shipped

| Page | URL | Notes |
|---|---|---|
| Homepage | `/` (and `/twp-homepage.html`) | Now the dev index. Refactored onto the shared design system (pixel-identical, screenshot-diffed), nav/footer point at the real pages, video band before the footer, store strip present but commented out. |
| Projects index | `/projects.html` | Statement hero, WORK band, 2×4 aqua grid from `assets/data/projects.json`, manifesto column. |
| Case study template | `/project.html?p=slug` | Title + hero colour populate from `projects.json`. |
| Filled case study | `/projects/lover-of-lies.html` | |
| Research index | `/research.html` | Feed from `assets/data/papers.json` — `essay` / `external` (new tab, ↗) / `image` / `news`. 8 seeded items. |
| Paper template | `/paper.html?p=slug` | Hero, split band, long article, image band, red-SUBSCRIBE newsletter row. |
| Filled paper | `/research/play-as-intelligence.html` | |
| About | `/about.html` | Two serif statements, GET IN TOUCH pill, team image band. |
| Store | `/store.html` | Filters (keyword chips, labels, price slider, color, size), search, sort pills, 4-up + featured-wide grid — all client-side over `assets/data/products.json`. |
| Product template | `/product.html?slug=slug` | Image + wishlist, TAG chip, price, options, BUY (Stripe Payment Links), FAQ accordion, reviews, newsletter. |
| Booking | `/book.html` + homepage BOOK A CALL | Exact rc-scheduler replica, live against the Worker. |
| Store module demo | `/store-module-demo.html` | The embeddable strip. |

**Design system:** `assets/css/twp.css` (everything, extracted verbatim from the homepage + new shared blocks), `assets/js/twp.js` (reveals, video band), `assets/js/booking.js`, `assets/js/store.js`, `assets/js/store-module.js`, `assets/js/dancers-embed.js`.

## ⚠️ One thing to do now

**Cancel the test booking:** Mon **2026-07-13, 14:30 UTC (10:30 EST)** — "〰️ TEST — Intro with Those Who Play (automated; please cancel)", booked to rafacastello@gmail.com via the Worker to prove the end-to-end flow (Meet link came back correctly). Delete it from Google Calendar.

## Decisions taken (assumptions)

- **Booking Worker:** `rc-booking.thosewhoplay.workers.dev` doesn't resolve; the widget uses **`rc-booking.rafacastello.workers.dev`** per the spec's locked decision. Bookings land on Rafa's current Google Calendar. Rotating title convention kept ("X with Those Who Play", 〰️ prefix on the invite).
- **Template pages are query-driven** (`?p=` / `?slug=`) rather than generated static files — one choice, used consistently for case studies, papers and products.
- **Homepage tiles:** a parallel commit removed the selected-work tiles from the homepage (Figma change); the tile treatment lives on in the Projects grid. Homepage "Projects" nav now links to `/projects.html`.
- **Dancers engine:** the shared `assets/js/dancers-embed.js` is the latest lab build (roaming, multiplication, reference face, hand size) — the deploy-everything instruction superseded the earlier hold.
- **Nav collapse:** CSS-only stacked header under 768px (no burger; works without JS).
- **Newsletter forms** (home, paper, product): no backend exists — buttons acknowledge locally, marked `TODO` in markup.
- **OG image** is a generated placeholder at `/assets/img/og-twp.png` with relative URLs (make absolute when the domain is final).

## §10 open items (drop-in, non-blocking)

1. **Stripe Payment Links** — create in Stripe Dashboard → paste URLs into `assets/data/products.json` (`stripePaymentLink`). Until then Buy renders "Coming soon". Options ride along as `client_reference_id=slug-size-color`. Never put a secret key in this repo.
2. **Real video** — replace `/assets/video/twp-loop.mp4` (+`.webm`, poster) or set `data-vimeo="ID"` / `data-youtube="ID"` on the homepage `.video-band`.
3. **Store strip on the homepage** — uncomment the `STORE MODULE` block near the newsletter.
4. **Real content** — everything marked `<!-- PLACEHOLDER -->`; images are generated SVG placeholders in `/assets/img/`.
5. **Booking title/copy** — confirmed "Intro with Those Who Play"; edit the left rail copy in `book.html` / homepage if wanted.

## QA (all pass, headless Chromium)

- Every page screenshot at 1440 and 390; no horizontal scroll at 390.
- All 25 unique internal links resolve; zero console errors on every page.
- JS disabled: header/footer/copy render on all pages (store/booking degrade with notices, as allowed).
- Booking: live Worker returned real slots (runner probe); full flow completed once for real (see above); demo fallback (`API_BASE=""`) completes DATE→TIME→DETAILS→DONE with valid Google/ICS/Outlook/Office/Yahoo links.
- Store: search, keyword chips, label/color/size filters, price slider, all four sorts, empty state.
- Video: autoplay muted loop playsinline + poster; reduced-motion gets a paused, controllable player.

## Workflows

- `deploy-staging.yml` — builds Next app → staging; mirrors all `public/*.html` + `assets/ projects/ research/` to dev; publishes the homepage as the dev index; lists deployed files.
- `booking-test.yml` — Worker probe + one-shot TEST booking (`DO_BOOK` gate) — no re-book on future pushes.
- `gen-video.yml` — renders the placeholder mp4 with ffmpeg on a runner (one-shot).
