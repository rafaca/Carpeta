# Build Typography Library — Figma plugin

Creates the freqz.rafacastello.com text styles (`Display/*`, `Body/*`, `Caption/*`) in the current Figma file.

The MCP-based remote plugin context cannot load custom local fonts (Pulpo, Firelli Variable, Giramisu VF, Shift, Panel), so this has to run inside Figma Desktop.

## Run

1. Open the typography file in **Figma Desktop**.
2. Menu → **Plugins → Development → Import plugin from manifest…**
3. Select `figma-plugin/manifest.json` from this repo.
4. Menu → **Plugins → Development → Build Typography Library**.
5. Watch the toast at the bottom of Figma. Open `Plugins → Development → Open console` for the full create/skip/fail report.

## What it creates

20 text styles, extracted from the text nodes in frame `Weekly Digest / April 29, 2026` (id `1:2`):

| Style                | Font                          | Size / Line height / Tracking |
| -------------------- | ----------------------------- | ----------------------------- |
| Display/Banner       | Giramisu VF Straight Tight    | 78 / 74.1 / -1.56             |
| Display/H1           | Firelli Variable Thin         | 59 / 61.95 / -0.59            |
| Display/Section      | Firelli Variable Medium\*     | 40 / 44 / -0.4                |
| Display/H2           | Firelli Variable Light        | 37 / 40.7 / -0.555            |
| Display/H3           | Firelli Variable Medium\*     | 28 / 36 / -0.42               |
| Display/Pullquote    | Firelli Variable Light Italic | 23 / 29.9 / 0                 |
| Display/H4           | Firelli Variable Medium\*     | 18 / 23.4 / 0                 |
| Display/H4 Link      | Firelli Variable Regular\*    | 18 / 21.6 / 0 (underline)     |
| Display/Stat         | Firelli Variable Regular\*    | 52 / 52 / -1.04               |
| Body/Standfirst      | Shift Medium                  | 17 / 25.5 / 0                 |
| Body/Lead            | Firelli Variable Light\*      | 16 / 24 / 0                   |
| Body/Paragraph       | Shift Light                   | 15 / 24 / 0                   |
| Body/Paragraph Bold  | Shift Bold                    | 15 / 24 / 0                   |
| Body/Paragraph Link  | Shift Light                   | 15 / 24 / 0 (underline)       |
| Body/Small           | Shift Light                   | 14 / 20.3 / 0                 |
| Caption/Eyebrow      | Panel Medium                  | 14 / 22.4 / 1.12 (UPPER)      |
| Caption/Eyebrow Bold | Panel Bold                    | 14 / 22.4 / 1.12 (UPPER)      |
| Caption/Tag          | Panel Medium                  | 14 / 18.2 / 1.12 (UPPER)      |
| Caption/Number       | Firelli Variable Bold\*       | 11 / 17.6 / 0.88 (UPPER)      |
| Caption/Small        | Panel Medium                  | 10 / 16 / 0.8 (UPPER)         |

\* These are originally `Pulpo` in the file. The plugin renames them to `Firelli Variable` (matching weight) when loading the library, with automatic fallback to `Pulpo` if a Firelli Variable weight is not installed.

## Configuration

Top of `code.js`:

- `REMAP_PULPO_TO_FIRELLI` — set to `false` to keep `Pulpo` as the underlying family.
- `PULPO_TO_FIRELLI_WEIGHT` — adjust the per-weight mapping if your Firelli Variable cuts use different style names (e.g. `Bold` → `Black`).
- `STYLES` — add, remove, or rename entries. Re-running the plugin only creates styles whose names don't already exist; existing styles are left untouched.

## Publishing as a library

After the styles are created and reviewed:

1. Top-left **Figma menu → Libraries** (or sidebar → Assets → book icon).
2. Find this file → **Publish**.
3. Confirm the styles list → **Publish**.

Other files in the team can now toggle this library on and pick the styles from the Text panel.
