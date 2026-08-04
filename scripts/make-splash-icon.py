#!/usr/bin/env python3
"""Generate the launch-screen seal from the app icon.

    python3 scripts/make-splash-icon.py
    -> assets/splash-icon.png

The Android 12 splash screen is mandatory on cold start and always shows an
icon, so the launch can't skip it — it can only stop looking like a separate
screen. It sits on #FAF8F3, the same paper colour BootSplash starts on, so the
hand-off into the animation is already seamless.

Why a circular crop of icon.png rather than the adaptive foreground: the book
in that artwork is drawn in cream, because it is meant to sit on the dark brown
adaptive-icon background. Dropped straight onto a cream splash it disappears
and leaves a floating quill. Cropping the full icon to a circle keeps the dark
tile behind the book, so it reads as a bookplate on paper.

Kept as a script rather than a hand-made binary so the asset is reproducible,
and regenerable if the app icon ever changes.
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "icon.png"
DEST = ROOT / "assets" / "splash-icon.png"

# Draw the mask oversized and shrink it back down. A mask drawn at final size
# stair-steps visibly where a dark disc meets pale cream.
SUPERSAMPLE = 4


def main() -> None:
    icon = Image.open(SOURCE).convert("RGBA")
    size = min(icon.size)
    if icon.size[0] != icon.size[1]:
        # Centre-crop to a square first; the circle is inscribed in that.
        left = (icon.size[0] - size) // 2
        top = (icon.size[1] - size) // 2
        icon = icon.crop((left, top, left + size, top + size))

    big = size * SUPERSAMPLE
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, big - 1, big - 1), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)

    seal = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    seal.paste(icon, (0, 0), mask)
    seal.save(DEST)

    print(f"wrote {DEST.relative_to(ROOT)} ({size}x{size})")


if __name__ == "__main__":
    main()
