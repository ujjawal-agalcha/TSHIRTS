import os
from psd_tools import PSDImage

psd_path = r"C:\Users\gaura\Downloads\OVERSIZED PRINTING flat.psd"
print(f"Checking PSD file at: {psd_path}")
if not os.path.exists(psd_path):
    print("File does not exist!")
    exit(1)

print("Loading PSD (this might take a few seconds)...")
psd = PSDImage.open(psd_path)
print(f"Canvas size: width={psd.width}, height={psd.height}, channels={psd.channels}, depth={psd.depth}, color_mode={psd.color_mode}")

def print_layer(layer, indent=0):
    prefix = "  " * indent
    info = f"{prefix}- [{layer.kind}] \"{layer.name}\" visible={layer.visible} opacity={layer.opacity} bbox={layer.bbox}"
    print(info)
    if layer.is_group():
        for sub in layer:
            print_layer(sub, indent + 1)

print("\nLayer Hierarchy:")
for layer in psd:
    print_layer(layer)
