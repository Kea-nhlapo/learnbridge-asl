from __future__ import annotations

import csv
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


SOURCE_ROOT = Path(r"C:\Screenshots\SA-Educate-demo-pages-upscaled-2x")
OUTPUT_ROOT = Path(r"C:\Screenshots\SA-Educate-demo-pages-4k")
SHEETS_ROOT = OUTPUT_ROOT / "contact-sheets"
TARGET_SIZE = (3840, 2560)

RESTORED_SOURCES = {
    "01-educator-login.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-f9fca922-e33d-4366-9d96-09debb925fa4.png"),
    "02-dashboard-loading.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-1b1c5c86-416f-4d5e-b665-6f4b32b3e9ff.png"),
    "03-educator-dashboard.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-4ea9c844-fd8f-4550-b70c-60e8b4f80b80.png"),
    "04-lesson-library-loading.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-f59e87b9-eead-49a4-9232-2dfd62fe96e1.png"),
    "05-lesson-plan-library.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-bc87393c-7cf6-49ed-ad9f-dbc5656b8343.png"),
    "06-create-lesson.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-311b4641-9c67-42cb-b8f5-2c4ee73e2ddb.png"),
    "07-upload-past-paper-pdf.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-55aa7bf1-68fe-402a-adca-4074205856c4.png"),
    "08-generating-lesson-from-paper.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-f46ead0c-7f08-454b-b28f-eaead1152f78.png"),
    "09-generating-questions-from-paper.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-c78cc81b-ecc9-4fcf-8c85-82d45273ad10.png"),
    "10-lesson-review-loading.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-b23488c2-9c97-402a-bcdc-62413d406ede.png"),
    "12-choose-class-loading.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-490295bc-52a5-4051-933a-d10e4cc89d4f.png"),
    "15-learner-path-loading.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-eadd7263-9acb-455c-90f1-78567e87bac0.png"),
    "17-question-loading.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-682cb0b8-96e7-431d-813e-70fcab82bd1f.png"),
    "19-question-2-eye-anatomy.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-d7e71f1d-773c-40ae-88dc-fa1bd0af57e8.png"),
    "20-question-3-insulin.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-655da079-502e-4675-8840-bf886ca28369.png"),
    "21-question-4-brain.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-7c2534b0-fd4a-42cb-8c5a-9bc97707ef1d.png"),
    "22-final-question-cold-day.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-2d3a76ad-fa45-428c-9fce-569fb0348a53.png"),
    "24-explanation-loading.png": Path(r"C:\Users\User\.codex\generated_images\01a17a32-596f-7a61-b550-cad03cb9ef29\exec-5f0a2871-d6af-41f0-9141-00d16cf74b32.png"),
}


def sharpness_score(image: Image.Image) -> float:
    sample = image.convert("L")
    sample.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    pixels = np.asarray(sample, dtype=np.float32)
    laplacian = (
        -4.0 * pixels[1:-1, 1:-1]
        + pixels[:-2, 1:-1]
        + pixels[2:, 1:-1]
        + pixels[1:-1, :-2]
        + pixels[1:-1, 2:]
    )
    return float(laplacian.var())


def enhancement_settings(score: float) -> tuple[str, int, float]:
    if score < 42:
        return "very soft", 210, 1.25
    if score < 75:
        return "soft", 165, 1.10
    if score < 120:
        return "slightly soft", 120, 1.00
    return "already crisp", 70, 0.85


def fit_thumbnail(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    copy = image.copy()
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, "white")
    x = (size[0] - copy.width) // 2
    y = (size[1] - copy.height) // 2
    canvas.paste(copy, (x, y))
    return canvas


def create_contact_sheets(paths: list[Path]) -> None:
    SHEETS_ROOT.mkdir(parents=True, exist_ok=True)
    columns, rows = 3, 3
    thumb_size = (512, 341)
    label_height = 52
    margin = 24
    sheet_size = (
        columns * thumb_size[0] + (columns + 1) * margin,
        rows * (thumb_size[1] + label_height) + (rows + 1) * margin,
    )
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 20)
    except OSError:
        font = ImageFont.load_default()

    for page_start in range(0, len(paths), columns * rows):
        page_paths = paths[page_start : page_start + columns * rows]
        sheet = Image.new("RGB", sheet_size, "white")
        draw = ImageDraw.Draw(sheet)
        for slot, path in enumerate(page_paths):
            column = slot % columns
            row = slot // columns
            x = margin + column * (thumb_size[0] + margin)
            y = margin + row * (thumb_size[1] + label_height + margin)
            with Image.open(path) as source:
                thumbnail = fit_thumbnail(source.convert("RGB"), thumb_size)
            sheet.paste(thumbnail, (x, y))
            draw.rectangle(
                (x, y, x + thumb_size[0], y + thumb_size[1]),
                outline=(190, 216, 235),
                width=2,
            )
            draw.text((x, y + thumb_size[1] + 10), path.stem, font=font, fill=(20, 48, 82))
        page_number = page_start // (columns * rows) + 1
        sheet.save(SHEETS_ROOT / f"contact-sheet-{page_number:02d}.png", optimize=True)


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    sources = sorted(SOURCE_ROOT.glob("*.png"))
    records: list[dict[str, str | int | float]] = []
    outputs: list[Path] = []

    for source_path in sources:
        selected_source = RESTORED_SOURCES.get(source_path.name, source_path)
        with Image.open(selected_source) as source_file:
            source = source_file.convert("RGB")
        before = sharpness_score(source)
        classification, strength, radius = enhancement_settings(before)

        enlarged = source.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
        enhanced = enlarged.filter(
            ImageFilter.UnsharpMask(radius=radius, percent=strength, threshold=3)
        )
        output_path = OUTPUT_ROOT / source_path.name
        enhanced.save(output_path, format="PNG", optimize=True)
        after = sharpness_score(enhanced)
        outputs.append(output_path)
        records.append(
            {
                "name": source_path.name,
                "source_dimensions": f"{source.width}x{source.height}",
                "output_dimensions": f"{enhanced.width}x{enhanced.height}",
                "assessment": f"AI-restored from soft source; {classification}" if source_path.name in RESTORED_SOURCES else classification,
                "sharpness_before": round(before, 2),
                "sharpness_after": round(after, 2),
                "sharpen_percent": strength,
                "output_bytes": output_path.stat().st_size,
            }
        )

    with (OUTPUT_ROOT / "quality-report.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)

    create_contact_sheets(outputs)
    for record in records:
        print(
            f"{record['name']}: {record['assessment']}; "
            f"{record['sharpness_before']} -> {record['sharpness_after']}"
        )


if __name__ == "__main__":
    main()
