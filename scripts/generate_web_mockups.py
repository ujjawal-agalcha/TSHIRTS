import os
from PIL import Image

src_dir = r"c:\TSHIRTS\templates\mockups"
web_dir = r"c:\TSHIRTS\templates\mockups\web"
os.makedirs(web_dir, exist_ok=True)

for name in ["black_front.png", "white_front.png", "black_back.png", "white_back.png"]:
    src = os.path.join(src_dir, name)
    if os.path.exists(src):
        img = Image.open(src)
        # Resize to 900px wide for super fast responsive web preview
        w, h = img.size
        ratio = 900 / float(w)
        new_size = (900, int(h * ratio))
        resized = img.resize(new_size, Image.Resampling.LANCZOS)
        out = os.path.join(web_dir, name)
        resized.save(out, optimize=True)
        print(f"Generated web mockup: {out} ({new_size})")

print("Web mockups generated successfully.")
