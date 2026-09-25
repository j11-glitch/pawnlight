"""Generate the app icons in public/ from assets/icon-source.webp.

Usage: python3 scripts/generate-icons.py   (requires Pillow: pip install pillow)

The source is a rounded orange square on a white margin. We cut out the square and
replace its white corners with the icon's own gradient, because iOS and Android apply
their own corner mask and must never show white corners.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "icon-source.webp"
OUT = ROOT / "public"

# Bounds of the rounded square inside the source image (measured once).
SQUARE = (104, 104, 1146, 1122)
CORNER_RADIUS = 228  # radius of the square's rounded corners in the source, in px
TOP_LEFT = (255, 214, 60)
BOTTOM_RIGHT = (242, 142, 8)


def gradient_color(x: int, y: int, w: int, h: int) -> tuple[int, int, int]:
    t = (x / w + y / h) / 2
    return tuple(round(a + (b - a) * t) for a, b in zip(TOP_LEFT, BOTTOM_RIGHT))


def full_square() -> Image.Image:
    img = Image.open(SOURCE).convert("RGB").crop(SQUARE)
    w, h = img.size
    px = img.load()
    r = CORNER_RADIUS
    for y in range(h):
        for x in range(w):
            # Only touch pixels beyond the rounded edge, never the artwork (e.g. the rays).
            cx = r if x < r else w - 1 - r if x > w - 1 - r else None
            cy = r if y < r else h - 1 - r if y > h - 1 - r else None
            if cx is None or cy is None:
                continue
            distance = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if distance < r - 4:
                continue
            red, green, blue = px[x, y]
            # White margin is ~255 in every channel; blend anti-aliased edge pixels.
            whiteness = min(max((min(red, green, blue) - 70) / 185, 0.0), 1.0)
            gr, gg, gb = gradient_color(x, y, w, h)
            px[x, y] = (
                round(red + (gr - red) * whiteness),
                round(green + (gg - green) * whiteness),
                round(blue + (gb - blue) * whiteness),
            )
    return img.resize((1024, 1024), Image.LANCZOS)


def maskable(icon: Image.Image, size: int) -> Image.Image:
    """Full-bleed icon for Android adaptive masks.

    The bulb and rays already sit inside the circular safe zone, and using the icon
    edge to edge lets the launcher's mask hide the square's bevelled rim.
    """
    return icon.resize((size, size), Image.LANCZOS)


def main() -> None:
    icon = full_square()
    outputs = {
        "apple-touch-icon.png": icon.resize((180, 180), Image.LANCZOS),
        "icon-192.png": icon.resize((192, 192), Image.LANCZOS),
        "icon-512.png": icon.resize((512, 512), Image.LANCZOS),
        "icon-maskable-512.png": maskable(icon, 512),
        "favicon-48.png": icon.resize((48, 48), Image.LANCZOS),
    }
    for name, image in outputs.items():
        image.save(OUT / name, optimize=True)
        print(f"wrote public/{name} {image.size[0]}x{image.size[1]}")


if __name__ == "__main__":
    main()
