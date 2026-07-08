# Build Typography Library — Figma plugin

Creates the freqz.rafacastello.com text styles (`Display/*`, `Body/*`, `Caption/*`) in the current Figma file.

The MCP-based remote plugin context cannot load custom fonts, so this has to run inside Figma Desktop.

## Run

1. Open the typography file in **Figma Desktop**.
2. Menu → **Plugins → Development → Import plugin from manifest…**
3. Select `figma-plugin/manifest.json` from this repo.
4. Menu → **Plugins → Development → Build Typography Library**.
5. Watch the toast at the bottom of Figma. Open `Plugins → Development → Open console` for the full create/skip/fail report.

## What it creates

31 text styles, extracted from the text nodes on the Apr-29-typography page (node `135:9281`). Style names match the local text styles already defined in the file (per `get_design_context` trailers); new names follow the same `Category/Variant` convention.

| Style | Font | Size / Line height / Tracking |
|---|---|---|
| Display/H1 | Firelli Variable Thin | 59 / 61.95 / -0.59 |
| Display/H1 Title | Firelli Variable Regular | 40 / 62 / -0.59 |
| Display/H1 Mobile | Firelli Variable Thin | 40 / 42 / -0.4 |
| Display/Stat | Firelli Variable Regular | 60 / 60 / -1.2 |
| Display/Section | Firelli Variable Regular | 40 / 40 / -0.8 |
| Display/H2 | Firelli Variable Regular | 30 / 35 / -0.55 |
| Display/H2 Page | Firelli Variable Light | 37 / 40.7 / -0.555 |
| Display/H2 Mobile | Firelli Variable Light | 28 / 30.8 / -0.42 |
| Display/H3 | Firelli Variable Regular | 24 / 30 / -0.24 |
| Display/H3 Mobile | Firelli Variable Regular | 20 / 24 / -0.2 |
| Display/H4 | Firelli Variable Regular | 22 / 35.2 / -0.22 |
| Display/Pullquote | Firelli Variable Light Italic | 23 / 29.9 / 0 |
| Body/Standfirst | Inter Medium | 17 / 25 / 0 |
| Body/Standfirst Alt | Questa Sans Medium | 17 / 25.5 / 0 |
| Body/Lead | Inter Light | 16 / 24 / 0 |
| Body/Paragraph | Inter Light | 15 / 24 / 0 |
| Body/Paragraph Bold | Inter Regular | 15 / 24 / 0 |
| Body/Paragraph Alt | Questa Sans Regular | 15 / 24 / 0 |
| Body/Paragraph Link | Inter Light | 15 / 24 / 0 (underline) |
| Body/Meta | Questa Sans Regular | 14 / 21 / 0 |
| Body/Caption | Questa Sans Regular | 12 / 19.2 / 0.48 |
| Caption/Eyebrow | Panel Medium | 14 / 22.4 / 1.12 (UPPER) |
| Caption/Eyebrow Bold | Panel Bold | 14 / 22.4 / 1.12 (UPPER) |
| Caption/Tag | Panel Medium | 14 / 18.2 / 1.12 (UPPER) |
| Caption/Section | Panel Bold | 11 / 17.6 / 1.32 (UPPER) |
| Caption/Issue Tag | Panel Bold | 11 / 17.6 / 1.54 (UPPER) |
| Caption/Number | Firelli Variable Bold | 11 / 17.6 / 0.88 (UPPER) |
| Caption/Metric Label | Panel Bold | 12 / 19.2 / 1.44 (UPPER) |
| Caption/Link Action | Panel Bold | 12.75 / 20.4 / 1.53 (UPPER) |
| Caption/Footer Nav | Panel Bold | 12 / 28.8 / 1.68 (UPPER) |
| Caption/Small | Panel Medium | 10 / 16 / 0.8 (UPPER) |

### Pulpo and Shift retired

The previous library used `Pulpo` (display) and `Shift` (body). Both are retired. Pulpo nodes are absorbed by the Firelli Variable styles where the metrics line up (`Caption/Number`, `Display/Section`, `Display/H3`, `Display/Stat`); Shift nodes are absorbed by `Inter`. `REMAP_PULPO_TO_FIRELLI` is now `false` by default — flip it back to `true` if you need to migrate a file that still has Pulpo nodes you want auto-rebound to Firelli Variable.

### Caption/Eyebrow Bold line-height

The file's stored definition has `lineHeight: 28.4`, but the dominant ad-hoc usage on the typography page (24 nodes) is `lineHeight: 22.4`. The plugin canonicalizes to `22.4` — re-running it will overwrite the file's existing style and auto-bind those 24 nodes.

## Configuration

Top of `code.js`:

- `REMAP_PULPO_TO_FIRELLI` — `false` by default. Set to `true` to remap remaining Pulpo nodes to the matching Firelli Variable weight when applying styles.
- `PULPO_TO_FIRELLI_WEIGHT` — adjust the per-weight mapping if your Firelli Variable cuts use different style names (e.g. `Bold` → `Black`).
- `STYLES` — add, remove, or rename entries. Existing styles are matched by name and updated in place; new names create new styles.

## Publishing as a library

After the styles are created and reviewed:

1. Top-left **Figma menu → Libraries** (or sidebar → Assets → book icon).
2. Find this file → **Publish**.
3. Confirm the styles list → **Publish**.

Other files in the team can now toggle this library on and pick the styles from the Text panel.
