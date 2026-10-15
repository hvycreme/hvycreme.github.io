"""Turn a botanical plate on white paper into a transparent cut-out.

Usage:  python3 tools/prepare_plate.py <input image> images/rose-plate.webp

Steps:
 1. "Ink" = any pixel noticeably darker/more colored than white paper.
 2. Group touching ink pixels into connected components. The plant is one big
    connected shape; the printed caption is many small separate letters, so
    keeping only large components removes the text automatically.
 3. Small light areas enclosed by the plant (petal highlights) stay opaque;
    large enclosed areas (paper between two stems) become transparent.
 4. Soft edges: pixels next to the background get partial transparency based on
    how close to white they are, then the white is "un-mixed" from their color
    so no white halo shows on the cream page.
Requires: pip install pillow numpy scipy
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

INK = 22          # how far from pure white (0-255) counts as ink
MIN_AREA = 1500   # components smaller than this (letters, specks) are dropped
MAX_HOLE = 250    # enclosed light areas smaller than this are kept opaque

src, dst = sys.argv[1], sys.argv[2]
rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
dist = (255 - rgb).max(axis=2)                     # 0 = white paper, higher = ink

ink = dist > INK
labels, n = ndimage.label(ink, structure=np.ones((3, 3)))
areas = ndimage.sum(ink, labels, index=np.arange(1, n + 1))
keep_ids = np.where(areas >= MIN_AREA)[0] + 1
plant = np.isin(labels, keep_ids)
# Fill only SMALL enclosed gaps (petal highlights). Large enclosed gaps, like
# paper showing between two stems, are real background and must stay clear.
holes = ndimage.binary_fill_holes(plant) & ~plant
hole_labels, hn = ndimage.label(holes)
hole_areas = ndimage.sum(holes, hole_labels, index=np.arange(1, hn + 1))
small = np.isin(hole_labels, np.where(hole_areas < MAX_HOLE)[0] + 1)
plant = plant | small

# Background = everything not plant. Soft alpha only in a thin band at the edge.
edge_band = ndimage.binary_dilation(plant, iterations=2) & ~ndimage.binary_erosion(plant, iterations=1)
alpha = plant.astype(np.float32)
soft = np.clip((dist - 12) / 40, 0, 1)
alpha[edge_band] = soft[edge_band]

# Un-premultiply white: observed = a*true + (1-a)*255  ->  true = (observed - (1-a)*255) / a
a = alpha[..., None]
safe = np.where(a > 0.02, a, 1)
true_rgb = np.clip((rgb - (1 - a) * 255) / safe, 0, 255)

out = np.dstack([true_rgb, alpha * 255]).astype(np.uint8)
img = Image.fromarray(out, "RGBA")
img = img.crop(img.getbbox())                     # trim empty margins
img.save(dst, "WEBP", quality=88, method=6)
print(f"{dst}: {img.size[0]}x{img.size[1]}, kept {len(keep_ids)} of {n} ink components")
