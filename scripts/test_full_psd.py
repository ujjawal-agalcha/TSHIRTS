import os
import time
import numpy as np
from PIL import Image
import pytoshop
from pytoshop import layers
from psd_tools import PSDImage

start = time.time()
print("Loading extracted base layer...")
base_img_path = r"c:\TSHIRTS\templates\extracted\0_blk_frnt.png"
base_img = Image.open(base_img_path).convert("RGBA")
print(f"Base image loaded: {base_img.size}, elapsed: {time.time() - start:.2f}s")

# Load a test artwork from NARUTO sample
sample_art_path = r"C:\Users\gaura\Downloads\NARUTO\NARUTO\NARUTO (1).png"
if os.path.exists(sample_art_path):
    art_img = Image.open(sample_art_path).convert("RGBA")
    print(f"Artwork loaded: {art_img.size}")
else:
    art_img = Image.new("RGBA", (800, 1000), (255, 100, 0, 200))

# Resize artwork to fit in zone (e.g. width=971, height=1451)
target_w, target_h = 971, 1451
art_img.thumbnail((target_w, target_h), Image.Resampling.LANCZOS)
top, left = 640, 864

print(f"Resized artwork: {art_img.size} at top={top}, left={left}")

def pil_to_pytoshop_layer(pil_img, name, top=0, left=0, visible=True):
    r, g, b, a = pil_img.split()
    w, h = pil_img.size
    channel_dict = {
        0: layers.ChannelImageData(image=np.ascontiguousarray(r), compression=0),
        1: layers.ChannelImageData(image=np.ascontiguousarray(g), compression=0),
        2: layers.ChannelImageData(image=np.ascontiguousarray(b), compression=0),
        -1: layers.ChannelImageData(image=np.ascontiguousarray(a), compression=0),
    }
    return layers.LayerRecord(
        name=name,
        top=top,
        left=left,
        bottom=top + h,
        right=left + w,
        channels=channel_dict,
        blend_mode=b'norm',
        opacity=255,
        visible=visible
    )

psd = pytoshop.core.PsdFile(num_channels=3, height=2643, width=2700)
l1 = pil_to_pytoshop_layer(base_img, "Black T-Shirt Front", top=0, left=0)
l2 = pil_to_pytoshop_layer(art_img, "Artwork Front", top=top, left=left)

psd.layer_and_mask_info.layer_info.layer_records.append(l1)
psd.layer_and_mask_info.layer_info.layer_records.append(l2)

out_psd = r"c:\TSHIRTS\templates\test_master_output.psd"
with open(out_psd, "wb") as f:
    psd.write(f)

print(f"Full-size PSD written to {out_psd} in {time.time() - start:.2f}s, size: {os.path.getsize(out_psd) / (1024*1024):.2f} MB")

# Verify
read = PSDImage.open(out_psd)
print(f"Verification: layers count={len(read)}, size={read.size}")
for l in read:
    print(f"  {l.name} bbox={l.bbox}")
