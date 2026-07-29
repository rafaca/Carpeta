# Album Cover Archive — build instructions

A static page that shows every album cover in the collection as a 100×100
thumbnail, in a grid that fills the full browser width, grouped by year,
with every album color-coded by genre.

No build step, no framework, no server — same architecture as the rest of
this repo (plain HTML/CSS/JS + a JSON data file, served by GitHub Pages).

## Files

| File | Purpose |
|---|---|
| `albums.html` | The archive page (header chrome + legend + year sections) |
| `albums.css` | Grid, tiles, color coding, legend, responsive rules |
| `albums.js` | Loads data, groups by year, renders grid, legend filtering |
| `albums.sample.json` | Sample dataset used when `albums.json` is absent |
| `albums.json` | Your real collection (generated, gitignored-optional) |
| `scan-albums.py` | Builds `albums.json` + `covers/` from a folder of images |

## Data format

`albums.json` (and the sample file) is an object with an `albums` array:

```json
{
  "albums": [
    {
      "title": "Album title",
      "artist": "Artist name",
      "year": 1994,
      "genre": "Hip-Hop",
      "cover": "covers/1994-artist-album.jpg"
    }
  ]
}
```

- `year` drives the grouping. Albums with no year land in an "Unknown" section.
- `genre` drives the color coding. Known genres use a fixed palette; any
  other genre string gets a stable auto-generated color (hash → hue), so
  new genres never collide with existing ones.
- `cover` is optional. Missing covers render a generated placeholder tile
  (initials over the genre color) so the grid never has holes.

## Behavior spec

1. **Grid**: `display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr))`
   so tiles are ~100×100, square (`aspect-ratio: 1`), and the grid always
   spans the entire browser width at any viewport size.
2. **Grouping**: one section per year, newest first, with a sticky year
   heading showing the album count. A toggle flips oldest-first.
3. **Color coding**: each tile carries a 3px bottom bar and hover ring in
   its genre color. A legend at the top lists every genre present with its
   swatch and count; clicking a legend chip filters the grid to that genre
   (click again, or "All", to clear).
4. **Performance**: `loading="lazy"` + `decoding="async"` on every `<img>`,
   and `content-visibility: auto` on year sections, so off-screen rows cost
   nothing. No virtualization needed below ~5,000 albums.
5. **Hover**: tile shows an overlay with title / artist / year; the same
   text lives in `title` and `alt` attributes for accessibility.

## Generating your real collection

Put cover images in a folder, named `YEAR - Artist - Title.jpg` (any
supported extension). Optionally group them in subfolders named after the
genre. Then:

```
python3 scan-albums.py /path/to/covers --copy
```

This copies images into `covers/`, and writes `albums.json`. Commit both.
For best load times resize covers to ~200×200 before committing (a 200px
JPEG is ~5–10 KB; the page renders them at 100 CSS px, 200 for retina).

## Compute estimate

- **Serving**: static files on GitHub Pages — zero server compute.
- **Browser**: 1,000 tiles ≈ 1,000 lazy images + ~3,000 DOM nodes; well
  under a millisecond-scale layout on any modern device. Comfortable up to
  ~5,000 albums; past that, add virtualization.
- **Bandwidth/storage**: at ~8 KB per 200px cover, 1,000 albums ≈ 8 MB of
  images total, fetched lazily as you scroll.
- **Generation**: `scan-albums.py` is I/O-bound; ~1–2 s per 1,000 files.
- **Development**: small — ~5 files, a few hundred lines of standard
  HTML/CSS/JS with no tricky algorithms. This spec is deliberately
  self-contained so a less capable code model (or a human afternoon) can
  implement it from this document alone.
