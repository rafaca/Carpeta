#!/usr/bin/env python3
"""
Scan a folder of album cover images and generate albums.json for the
Album Cover Archive (albums.html).

Usage:
    python3 scan-albums.py /path/to/covers [--copy]

Naming convention (any supported image extension):
    YEAR - Artist - Title.jpg      e.g.  1994 - Nas - Illmatic.jpg
    Artist - Title.jpg             (year omitted -> "Unknown" section)

Genre: if a cover sits inside a subfolder, the subfolder name is used as
its genre (e.g. covers/Hip-Hop/1994 - Nas - Illmatic.jpg).

Options:
    --copy    Copy images into ./covers/ (recommended for serving from
              the repo). Without it, original absolute paths are used.
"""

import json
import re
import shutil
import sys
from pathlib import Path

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'}

NAME_RE = re.compile(r'^(?:(?P<year>\d{4})\s*-\s*)?(?P<artist>[^-]+?)\s*-\s*(?P<title>.+)$')


def parse_name(path, root):
    stem = path.stem
    m = NAME_RE.match(stem)
    if m and m.group('title'):
        year = int(m.group('year')) if m.group('year') else None
        artist = m.group('artist').strip()
        title = m.group('title').strip()
    else:
        year, artist, title = None, 'Unknown', stem.strip()

    rel = path.parent.relative_to(root)
    genre = rel.parts[0] if rel.parts else None
    return year, artist, title, genre


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    root = Path(sys.argv[1]).expanduser().resolve()
    copy_files = '--copy' in sys.argv
    if not root.is_dir():
        print(f"Error: '{root}' is not a directory")
        sys.exit(1)

    images = sorted(
        p for p in root.rglob('*')
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    )
    if not images:
        print('No images found!')
        sys.exit(1)
    print(f'Found {len(images)} covers')

    script_dir = Path(__file__).parent.resolve()
    covers_dir = script_dir / 'covers'
    if copy_files:
        covers_dir.mkdir(exist_ok=True)

    albums = []
    for img in images:
        year, artist, title, genre = parse_name(img, root)

        if copy_files:
            safe = re.sub(r'[^\w.-]+', '-', img.stem.lower()).strip('-')
            dest = covers_dir / f'{safe}{img.suffix.lower()}'
            if not dest.exists():
                shutil.copy2(img, dest)
            src = f'covers/{dest.name}'
        else:
            src = str(img)

        entry = {'title': title, 'artist': artist, 'cover': src}
        if year:
            entry['year'] = year
        if genre:
            entry['genre'] = genre
        albums.append(entry)

    out = script_dir / 'albums.json'
    with open(out, 'w') as f:
        json.dump({'source': str(root), 'count': len(albums), 'albums': albums}, f, indent=2)
    print(f"Generated '{out}' with {len(albums)} albums")
    if copy_files:
        print(f"Covers copied to '{covers_dir}'")
    print('\nOpen albums.html via a local server to view:')
    print('  python3 -m http.server 8000  ->  http://localhost:8000/albums.html')


if __name__ == '__main__':
    main()
