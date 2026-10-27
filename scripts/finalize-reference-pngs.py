from pathlib import Path
from PIL import Image

source = Path(r"C:\Users\User\.codex\generated_images\01a17b78-2297-7053-a99f-de84b282eae1")
target = Path(r"C:\Screenshots")
files = {
    "exec-4050109d-58db-4902-bf45-42ba2221e95a.png": "02-dashboard-loading-upscaled-book-logo.png",
    "exec-7e610873-1bfa-4493-818e-d9a5e149a6b5.png": "04-lesson-library-loading-upscaled-book-logo.png",
    "exec-2e80fdc3-38b6-4aa9-815d-b60bbd9844aa.png": "06-create-lesson-upscaled-book-logo.png",
    "exec-abf7be01-bbb7-43c9-b9f8-80768eaf16b4.png": "07-upload-past-paper-upscaled-book-logo.png",
}

for source_name, target_name in files.items():
    image = Image.open(source / source_name)
    # Remove the thin rounded presentation edge while retaining the app frame.
    image.crop((4, 4, image.width - 4, image.height - 4)).save(target / target_name)
