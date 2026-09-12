import os
from psd_tools import PSDImage
from PIL import Image

psd_path = r"C:\Users\gaura\Downloads\OVERSIZED PRINTING flat.psd"
out_dir = r"c:\TSHIRTS\templates\extracted"
os.makedirs(out_dir, exist_ok=True)

print("Opening PSD...")
psd = PSDImage.open(psd_path)

for i, layer in enumerate(psd):
    print(f"Layer {i}: {layer.name} ({layer.kind}), visible={layer.visible}, bbox={layer.bbox}")
    try:
        img = layer.topil()
        if img:
            safe_name = layer.name.replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_")
            out_file = os.path.join(out_dir, f"{i}_{safe_name}.png")
            img.save(out_file)
            print(f"  Saved {out_file} (mode={img.mode}, size={img.size})")
    except Exception as e:
        print(f"  Error extracting layer {layer.name}: {e}")

print("Done extracting layers.")
