"""Crop, color-match, and export a headshot for the site.

Usage:  python3 tools/prepare_headshot.py <photo.jpg>
Writes images/headshot-800.webp and images/headshot-480.webp.

Color match: measures the average wall color in the top corners, then scales
each color channel so the wall lands on WALL_TARGET (a cream from the site's
palette). Same idea as white balance: one multiplier per channel, applied to
the whole photo, so skin and clothing shift by the same small amount.
Metadata (EXIF, including any GPS location) is not copied to the output.
Requires: pip install pillow numpy
"""
import sys
import numpy as np
from PIL import Image

WALL_TARGET = np.array([238, 231, 216])  # a shade darker than the page, so the arch reads
CROP = (150, 430, 1350, 1930)            # left, top, right, bottom: 4:5 portrait around the face

img = Image.open(sys.argv[1]).convert("RGB")
a = np.asarray(img).astype(np.float32)

h, w = a.shape[:2]
corners = np.concatenate([a[40:300, 40:300].reshape(-1, 3), a[40:300, w - 300:w - 40].reshape(-1, 3)])
wall = corners.mean(axis=0)
gain = WALL_TARGET / wall
print("wall", wall.round(1), "-> gain", gain.round(3))

matched = Image.fromarray(np.clip(a * gain, 0, 255).astype(np.uint8)).crop(CROP)
for width in (800, 480):
    out = matched.resize((width, width * 5 // 4), Image.LANCZOS)
    out.save(f"images/headshot-{width}.webp", "WEBP", quality=82, method=6)
    print(f"images/headshot-{width}.webp")
