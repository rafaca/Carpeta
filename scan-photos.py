#!/usr/bin/env python3
"""
Scan a folder for images and generate photos.json for the Infinite Canvas.

Usage:
    python scan-photos.py /path/to/your/photos [--copy]

Options:
    --copy    Copy images to ./photos/ folder (recommended for local serving)
              Without this flag, absolute paths are used (requires proper CORS setup)
"""

import os
import sys
import json
import shutil
import hashlib
from pathlib import Path

# Supported image extensions
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'}

def get_image_files(folder_path, recursive=True):
    """Find all image files in the specified folder."""
    folder = Path(folder_path)
    images = []

    if recursive:
        for ext in IMAGE_EXTENSIONS:
            images.extend(folder.rglob(f'*{ext}'))
            images.extend(folder.rglob(f'*{ext.upper()}'))
    else:
        for ext in IMAGE_EXTENSIONS:
            images.extend(folder.glob(f'*{ext}'))
            images.extend(folder.glob(f'*{ext.upper()}'))

    # Remove duplicates and sort
    images = sorted(set(images))
    return images

def generate_id(path):
    """Generate a unique ID for an image based on its path."""
    return hashlib.md5(str(path).encode()).hexdigest()[:12]

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nExample:")
        print("  python scan-photos.py ~/Pictures/Google\\ Photos/Takeout --copy")
        sys.exit(1)

    source_folder = sys.argv[1]
    copy_files = '--copy' in sys.argv

    if not os.path.isdir(source_folder):
        print(f"Error: '{source_folder}' is not a valid directory")
        sys.exit(1)

    print(f"Scanning '{source_folder}' for images...")
    images = get_image_files(source_folder)

    if not images:
        print("No images found!")
        sys.exit(1)

    print(f"Found {len(images)} images")

    # Output directory (same as this script)
    script_dir = Path(__file__).parent.resolve()
    photos_dir = script_dir / 'photos'

    photos_data = []

    if copy_files:
        # Create photos directory
        photos_dir.mkdir(exist_ok=True)
        print(f"Copying images to '{photos_dir}'...")

        for i, img_path in enumerate(images):
            # Generate unique filename to avoid collisions
            ext = img_path.suffix.lower()
            img_id = generate_id(img_path)
            new_name = f"{img_id}{ext}"
            dest_path = photos_dir / new_name

            # Copy file if not already there
            if not dest_path.exists():
                try:
                    shutil.copy2(img_path, dest_path)
                except Exception as e:
                    print(f"Warning: Could not copy {img_path}: {e}")
                    continue

            photos_data.append({
                'id': img_id,
                'src': f'photos/{new_name}',
                'original': str(img_path)
            })

            # Progress indicator
            if (i + 1) % 100 == 0:
                print(f"  Processed {i + 1}/{len(images)} images...")

    else:
        # Use file:// URLs (note: requires browser security adjustment)
        print("Using absolute paths (for local development)")
        print("Note: You may need to start a local server for this to work")

        for img_path in images:
            img_id = generate_id(img_path)
            photos_data.append({
                'id': img_id,
                'src': str(img_path.resolve()),
                'original': str(img_path)
            })

    # Write photos.json
    output_file = script_dir / 'photos.json'
    with open(output_file, 'w') as f:
        json.dump({
            'source': source_folder,
            'count': len(photos_data),
            'photos': photos_data
        }, f, indent=2)

    print(f"\nGenerated '{output_file}' with {len(photos_data)} photos")

    if copy_files:
        print(f"Images copied to '{photos_dir}'")

    print("\nTo view the gallery:")
    print("  1. Start a local server: python -m http.server 8000")
    print("  2. Open: http://localhost:8000")

if __name__ == '__main__':
    main()
