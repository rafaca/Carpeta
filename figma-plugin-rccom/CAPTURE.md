# rafacastello.com → RCCOM capture (2026-08-05)

Three pages captured at 1440 into the **RCCOM** file, page **NEW**, inside the
section `rafacastello.com — site capture (2026-08-05)` (`3086:294`).

| Frame | Node | Size | Source |
|---|---|---|---|
| Home — rafacastello.com / 1440 | `3086:295` | 1440 × 1824 | `/index.html` |
| Work / Google — rafacastello.com / 1440 | `3086:296` | 1440 × 1378 | `/work/google.html` |
| About — rafacastello.com / 1440 | `3086:297` | 1440 × 900 | `/about.html` |

Geometry, colour and copy were read off the rendered pages (headless Chromium,
1440 × 900 viewport, full scroll) rather than transcribed, so positions match the
live layout to the pixel. Page ground is the `--paper-top → --paper-bot`
gradient (`#F4F7F8 → #EAEAE8`) from `assets/tokens.css`.

## Structure

- **Header** (all three) — masked `logo-castello.svg` at 258×38, nav
  (ABOUT / PROJECTS / FREQUENCIES) and the outlined CONTACT pill, all in
  `#425DBD`.
- **Home** — typewriter H1 (full string, not the mid-type frame), the yellow
  `marks/hello.svg` hand, and the 17-row project index as a vertical
  auto-layout: `01 Google` … `17 Covikinga`, 43px rows with an 8%-black hairline
  on top, numbers in `#FF5900`.
- **Work / Google** — back link, `Google` title in `#F7371C`, intro paragraph,
  the SCOPE / ROLE / YEAR meta table, and the two figures.
- **About** — bio column (three paragraphs + the green `BOOK A CALL` button with
  its star), and SELECT CLIENTS as four auto-layout columns, 37 names.
- **Footer** (all three) — CLIENT PORTAL plus the LinkedIn / Substack / playhtml
  icon SVGs.

Every text node is linked to a file text style — `Display/XL`, `Display/M`,
`Body/Base`, `Label/Button` — rather than carrying loose overrides, so the type
follows the styles when the plugin rewrites them.

## What the plugin still has to finish

The capture was written through the Figma MCP remote plugin context, which has
neither the site's fonts installed nor network access. Two consequences:

1. **Fonts.** Text nodes carry the right *styles*, and those styles carry the
   right families, but the remote context could not re-point a style at
   `Questa Sans` / `Code Saver` / `Firelli Variable` — assigning a font requires
   loading it first. `Label/Nav`, `Label/Eyebrow`, `Label/Footer` and
   `Label/Micro` were re-metricked in place (11 / .18em / uppercase; Micro at 10)
   because Gothic A1 *is* installed there; the family swaps need Desktop.
2. **Images.** `IMG · /assets/work/google-fig-1.webp` and `…-fig-2.webp` are
   correctly sized, positioned and labelled placeholders. Figma's SVG importer
   does not fetch remote hrefs and the asset-upload host was unreachable from
   the capture session, so the bytes need `figma.createImageAsync` from Desktop.

Run the plugin in this directory and both are resolved.

## Known deltas from the live page

- Sizes are the desktop end of each `clamp()`; the fluid mid-range is not
  represented.
- `Display/M` (landing greeting) currently sits at 105% line height in the file
  against 129% on the site — the plugin corrects this.
- The `nav-fade` gradient scrim under the header is not reproduced; the flat
  page gradient stands in for it.
- The home hero is captured at its final typed string, not mid-animation.
