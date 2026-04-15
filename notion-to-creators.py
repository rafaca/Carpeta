#!/usr/bin/env python3
"""
Convert a Notion CSV export of a creators database into creators.json
for the Creator Network visualization.

Usage:
    python notion-to-creators.py path/to/notion-export.csv [-o creators.json]

The script is forgiving about column names: it looks for columns whose
header (case-insensitive) matches one of the aliases below, then falls
back to substring matching. Adjust the alias lists at the top of the
file if your database uses different names.

Notion export tips
------------------
1. Open your database view in Notion.
2. Click the "..." menu > Export.
3. Export format: "Markdown & CSV" (or "CSV" in simple databases).
4. Use the .csv file that Notion produces as input here.

Relation columns
----------------
Notion exports relation columns as comma-separated page titles. The
script tries to resolve those titles back to creator ids by matching
them against each creator's name or handle. If a relation value does
not match any creator in the export, it is kept as-is so you can fix
it manually later.
"""

import argparse
import csv
import json
import re
import sys

NAME_ALIASES = ["name", "creator", "title"]
HANDLE_ALIASES = ["handle", "instagram", "ig", "username", "@"]
CATEGORY_ALIASES = ["category", "categories", "tags", "niche", "type", "topic"]
FOLLOWERS_ALIASES = ["followers", "follower count", "audience", "reach"]
BIO_ALIASES = ["bio", "description", "notes", "about", "summary"]
FOLLOWS_ALIASES = ["follows", "following", "is following"]
COLLAB_ALIASES = [
    "collaborations",
    "collabs",
    "collaborated with",
    "worked with",
    "collab",
]
AVATAR_ALIASES = ["avatar", "profile image", "image", "photo", "picture"]


def find_column(header, aliases):
    """Return the original header name that best matches one of the aliases."""
    lower = {h.lower().strip(): h for h in header}
    # Exact match first.
    for alias in aliases:
        if alias in lower:
            return lower[alias]
    # Substring match as a fallback.
    for alias in aliases:
        for key, original in lower.items():
            if alias in key:
                return original
    return None


def split_multi(value):
    """Split a Notion multi-select / relation value into a list of strings."""
    if not value:
        return []
    parts = re.split(r"[,;\n]\s*", value)
    return [p.strip() for p in parts if p.strip()]


def slugify(value):
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_")


def to_int(value):
    if not value:
        return None
    cleaned = re.sub(r"[^\d]", "", value)
    return int(cleaned) if cleaned else None


def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("input", help="Path to Notion CSV export")
    parser.add_argument(
        "-o",
        "--output",
        default="creators.json",
        help="Output JSON path (default: creators.json)",
    )
    args = parser.parse_args()

    with open(args.input, encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            print("ERROR: input file is empty", file=sys.stderr)
            sys.exit(1)
        rows = list(reader)

    cols = {
        "name": find_column(header, NAME_ALIASES),
        "handle": find_column(header, HANDLE_ALIASES),
        "categories": find_column(header, CATEGORY_ALIASES),
        "followers": find_column(header, FOLLOWERS_ALIASES),
        "bio": find_column(header, BIO_ALIASES),
        "follows": find_column(header, FOLLOWS_ALIASES),
        "collaborations": find_column(header, COLLAB_ALIASES),
        "avatar": find_column(header, AVATAR_ALIASES),
    }

    if not cols["name"]:
        print(
            "ERROR: Could not find a name/title column. "
            f"Available columns: {header}",
            file=sys.stderr,
        )
        sys.exit(1)

    idx = {h: i for i, h in enumerate(header)}

    def cell(row, key):
        col = cols[key]
        if not col:
            return ""
        i = idx[col]
        return row[i] if i < len(row) else ""

    creators = []
    for row in rows:
        if not any(c.strip() for c in row):
            continue

        name = cell(row, "name").strip()
        if not name:
            continue

        raw_handle = cell(row, "handle").strip()
        handle = raw_handle.lstrip("@").strip() if raw_handle else ""
        creator_id = handle or slugify(name)

        creator = {
            "id": creator_id,
            "name": name,
            "handle": handle,
            "categories": split_multi(cell(row, "categories")),
            "follows": split_multi(cell(row, "follows")),
            "collaborations": split_multi(cell(row, "collaborations")),
        }

        followers = to_int(cell(row, "followers"))
        if followers is not None:
            creator["followers"] = followers

        bio = cell(row, "bio").strip()
        if bio:
            creator["bio"] = bio

        avatar = cell(row, "avatar").strip()
        if avatar:
            creator["avatar"] = avatar

        creators.append(creator)

    # Resolve relation values (follows / collaborations) to creator ids.
    name_to_id = {c["name"].strip().lower(): c["id"] for c in creators}
    handle_to_id = {
        c["handle"].strip().lower(): c["id"] for c in creators if c["handle"]
    }

    def resolve(ref):
        key = ref.strip().lstrip("@").lower()
        return handle_to_id.get(key) or name_to_id.get(key) or ref

    for c in creators:
        c["follows"] = [resolve(r) for r in c["follows"]]
        c["collaborations"] = [resolve(r) for r in c["collaborations"]]

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump({"creators": creators}, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Wrote {len(creators)} creators to {args.output}")
    print("Detected columns:")
    for key, col in cols.items():
        marker = col if col else "(not found)"
        print(f"  {key:<15} -> {marker}")


if __name__ == "__main__":
    main()
