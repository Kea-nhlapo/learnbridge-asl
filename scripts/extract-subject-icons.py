"""Extract the six supplied subject illustrations without their pale card backgrounds.

Run with the bundled Pillow runtime. The input is the borderless library reference.
"""
from pathlib import Path
from PIL import Image

source = Image.open(r"C:\Screenshots\lesson-plan-library-borderless.png").convert("RGB")
output = Path(__file__).resolve().parents[1] / "public" / "assets" / "subjects"
output.mkdir(parents=True, exist_ok=True)

boxes = {
    "mathematics": (510, 380, 640, 520),
    "physical-sciences": (875, 380, 1015, 520),
    "business-studies": (1238, 380, 1407, 520),
    "geography": (500, 707, 646, 864),
    "life-sciences": (865, 705, 1030, 865),
    "visual-arts": (1242, 706, 1405, 866),
}

for name, box in boxes.items():
    crop = source.crop(box).convert("RGBA")
    pixels = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, _ = pixels[x, y]
            chroma = max(r, g, b) - min(r, g, b)
            darkness = 245 - min(r, g, b)
            # The card is nearly white with a faint cyan tint. Retain the
            # saturated artwork and its antialiased edges, including shadows.
            strength = max((chroma - 27) / 24, (darkness - 28) / 45)
            alpha = max(0, min(255, round(strength * 255)))
            pixels[x, y] = (r, g, b, alpha)
    crop.save(output / f"{name}.png")
