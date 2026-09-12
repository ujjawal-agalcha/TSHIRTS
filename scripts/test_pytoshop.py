import numpy as np
from PIL import Image
import pytoshop
from pytoshop import layers
from psd_tools import PSDImage

test_psd_file = r"c:\TSHIRTS\templates\test_output.psd"

base = Image.new("RGBA", (200, 200), (255, 255, 255, 255))
art = Image.new("RGBA", (60, 60), (255, 0, 0, 255))

psd = pytoshop.core.PsdFile(num_channels=3, height=200, width=200)

def pil_to_pytoshop_layer(pil_img, name, top=0, left=0, visible=True):
    r, g, b, a = pil_img.split()
    r_arr = np.array(r)
    g_arr = np.array(g)
    b_arr = np.array(b)
    a_arr = np.array(a)
    
    # compression=0 is RAW (uncompressed)
    channel_dict = {
        0: layers.ChannelImageData(image=r_arr, compression=0),
        1: layers.ChannelImageData(image=g_arr, compression=0),
        2: layers.ChannelImageData(image=b_arr, compression=0),
        -1: layers.ChannelImageData(image=a_arr, compression=0),
    }
    
    w, h = pil_img.size
    layer = layers.LayerRecord(
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
    return layer

l1 = pil_to_pytoshop_layer(base, "Tshirt Background", top=0, left=0)
l2 = pil_to_pytoshop_layer(art, "Artwork Front", top=50, left=50)

psd.layer_and_mask_info.layer_info.layer_records.append(l1)
psd.layer_and_mask_info.layer_info.layer_records.append(l2)

with open(test_psd_file, "wb") as f:
    psd.write(f)

print(f"PSD written successfully to {test_psd_file}")

read_psd = PSDImage.open(test_psd_file)
print(f"Read back PSD: size={read_psd.size}, layers={len(read_psd)}")
for lay in read_psd:
    print(f"  Layer: '{lay.name}', bbox={lay.bbox}, visible={lay.visible}")

composite = read_psd.composite()
print("Composite generated successfully, size:", composite.size)
