# Build Typography Library — Figma plugin

Creates the freqz.rafacastello.com text styles (`Display/*`, `Body/*`) in the current Figma file.

The MCP-based remote plugin context cannot load custom local fonts (Firelli Variable, Questa Sans, Panel), so this has to run inside Figma Desktop.

## Run

1. Open the typography file in **Figma Desktop**.
2. Menu → **Plugins → Development → Import plugin from manifest…**
3. Select `figma-plugin/manifest.json` from this repo.
4. Menu → **Plugins → Development → Build Typography Library**.
5. Watch the toast at the bottom of Figma. Open `Plugins → Development → Open console` for the full create/skip/fail report.

## What it creates

7 text styles — the deduplicated FREQZ system, mirrored 1:1 in `styles.css`:

| Style | Font | Size / Line height / Tracking |
|---|---|---|
| Display/H1 | Firelli Variable Regular | 40 / 50 / -0.59 |
| Display/H2 | Firelli Variable Regular | 25 / 30 / -0.56 |
| Display/H3 | Firelli Variable Regular | 22 / 35.2 / -0.22 |
| Body/Callout | Firelli Variable SemiBold | 18 / 27 / -0.1 |
| Body/Standfirst | Questa Sans Medium | 17 / 25.5 / 0 |
| Body/Paragraph | Questa Sans Regular | 15 / 24 / 0 |
| Body/Eyebrow | Panel Bold | 11 / 17.6 / 1.32 (UPPER) |

## Configuration

Top of `code.js`:

- `TAG_NODES` — set to `false` to skip the second pass that links unstyled text nodes to a matching style.
- `STYLES` — add, remove, or rename entries. Re-running the plugin updates existing styles in place (matched by name) and creates any new ones.

## Publishing as a library

After the styles are created and reviewed:

1. Top-left **Figma menu → Libraries** (or sidebar → Assets → book icon).
2. Find this file → **Publish**.
3. Confirm the styles list → **Publish**.

Other files in the team can now toggle this library on and pick the styles from the Text panel.
