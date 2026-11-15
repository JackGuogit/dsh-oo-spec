"""Render the storefront tile (assets/icon-180.png) for the plugin market.

The market shows a GitHub-hosted raster image as the card tile; the SVG in the
package root stays the in-app icon. Drawn at 4x and downsampled so the rounded
corners and the check stroke come out clean.

    python scripts/render-tile.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets" / "icon-180.png"
SIZE = 180
SCALE = 4
S = SIZE * SCALE

BG = (31, 111, 235, 255)      # #1f6feb
FRAME = (255, 255, 255, 158)  # 62% white
CHECK = (255, 255, 255, 255)

image = Image.new("RGBA", (S, S), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)

# Rounded field.
radius = int(S * 0.25)
draw.rounded_rectangle((0, 0, S - 1, S - 1), radius=radius, fill=BG)

# One frame: the gate the work has to pass. A second border only reads as noise
# once the tile is shown at card size.
stroke = max(1, int(S * 0.05))
inset = int(S * 0.155)
draw.rounded_rectangle(
    (inset, inset, S - 1 - inset, S - 1 - inset),
    radius=int(S * 0.16),
    outline=FRAME,
    width=stroke,
)

# The check, drawn as a thick two-segment stroke with round caps.
width = int(S * 0.095)
points = [(int(S * 0.355), int(S * 0.525)), (int(S * 0.455), int(S * 0.625)), (int(S * 0.665), int(S * 0.385))]
draw.line(points, fill=CHECK, width=width, joint="curve")
for x, y in (points[0], points[-1]):
    draw.ellipse((x - width // 2, y - width // 2, x + width // 2, y + width // 2), fill=CHECK)

image.resize((SIZE, SIZE), Image.LANCZOS).save(OUT, "PNG", optimize=True)
print(f"{OUT} — {OUT.stat().st_size} bytes, {SIZE}x{SIZE}")
