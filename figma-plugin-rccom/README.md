# RCCOM Type + Capture Assets — Figma plugin

Finishes the rafacastello.com capture in the **RCCOM** Figma file
(`XWFFRMk5WLByOUyMtdCVFK`). Two jobs, both of which have to run in **Figma
Desktop** — the MCP remote plugin context can neither load the site's fonts nor
reach the network.

## Run

1. Open the RCCOM file in **Figma Desktop**.
2. Menu → **Plugins → Development → Import plugin from manifest…**
3. Select `figma-plugin-rccom/manifest.json` from this repo.
4. Menu → **Plugins → Development → RCCOM Type + Capture Assets**.
5. Open `Plugins → Development → Open console` for the full report.

## 1. Type

Rewrites the text styles to the families and metrics in
[`assets/type.css`](https://github.com/rafaca/rafacastello.com/blob/main/assets/type.css)
on the live site. Sizes are the desktop (max) end of each `clamp()` — what the
1440 captures were taken at.

| Style | Font | Size / Line height / Tracking |
|---|---|---|
| Display/XL | Firelli Variable Thin* | 56 / 61.6 / −1.12 |
| Display/L | Firelli Variable Thin* | 38 / 41.8 / −0.76 |
| Display/M | Firelli Variable Thin* | 30 / 38.7 / −0.6 |
| Body/Large | Questa Sans Regular | 18 / 28.8 / 0 |
| Body/Base | Questa Sans Regular | 15 / 24 / 0 |
| Body/Small † | Questa Sans Regular | 13 / 20.8 / 0 |
| Label/Nav | Code Saver SemiBold* | 11 / 17.6 / 1.98 (UPPER) |
| Label/Eyebrow | Code Saver SemiBold* | 11 / 17.6 / 1.98 (UPPER) |
| Label/Footer | Code Saver SemiBold* | 11 / 17.6 / 1.98 (UPPER) |
| Label/Button | Code Saver SemiBold* | 11 / 17.6 / 1.98 (UPPER) |
| Label/Micro | Code Saver SemiBold* | 10 / 16 / 1.8 (UPPER) |
| Label/Index Number † | Code Saver SemiBold* | 11 / 11 / 1.98 |
| Label/Meta Title | Questa Sans Regular | 15 / 24 / 0 |

† Created by this plugin — not in the file yet.
\* Each row lists fallback weights in `STYLES`; the first installed one wins,
so a missing `SemiBold` lands on `Bold` rather than failing.

The three families the file was already carrying map like this:

| Was | Becomes | Why |
|---|---|---|
| Bilo (Body/*) | Questa Sans | `--body`/`--bilo` both resolve to `--questa` in type.css |
| Gothic A1 (Label/*) | Code Saver | `--mono` is `code-saver`; it carries nav, labels and index numbers |
| Firelli Variable Light/Regular | Firelli Variable Thin | type.css sets `wght 100` on `.t-display` and `.t-title` |

`Title` and `eye` are left alone — they are FranklinGothic legacy styles and are
not part of the current type system.

## 2. Capture images

Any frame named `IMG · <path>` gets filled from `https://www.rafacastello.com<path>`
via `figma.createImageAsync`, and its placeholder caption is removed. The capture
currently ships two:

- `IMG · /assets/work/google-fig-1.webp` — 644×384
- `IMG · /assets/work/google-fig-2.webp` — 644×567

Frames already carrying an image fill are refilled from the live asset, so
re-running the plugin is how you refresh a capture after the site changes.

## Configuration

Top of `code.js`:

- `DO_TYPE` / `DO_IMAGES` — run either half on its own.
- `SITE_ORIGIN` — point the image fill at a staging host instead.
- `STYLES` — add, remove or retune a style. Existing styles are rewritten in
  place (keeping every node already linked to them); missing ones are created.
