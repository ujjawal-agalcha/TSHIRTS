import os
import abc
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Optional
# pyrefly: ignore [missing-import]
import pytoshop
# pyrefly: ignore [missing-import]
from pytoshop import layers

class PSDProcessorInterface(abc.ABC):
    @abc.abstractmethod
    def load_template(self, template_path: str):
        pass

    @abc.abstractmethod
    def add_artwork_layer(
        self,
        image: Image.Image,
        name: str,
        top: int,
        left: int,
        opacity: int = 255,
        visible: bool = True
    ):
        pass

    @abc.abstractmethod
    def export_psd(self, output_path: str) -> str:
        pass


class PytoshopPSDProcessor(PSDProcessorInterface):
    """
    Production PSD processor using pytoshop to write authentic Adobe Photoshop
    multi-layer PSD files with native 8-bit RGBA channels and bounding boxes.
    """
    def __init__(self, width: int = 2700, height: int = 2643):
        self.width = width
        self.height = height
        self.psd = pytoshop.core.PsdFile(num_channels=3, height=height, width=width)
        self.layers_list: List[layers.LayerRecord] = []
        self._composite_image: Image.Image = Image.new("RGBA", (width, height), (0, 0, 0, 0))

    def load_template(self, template_path: str):
        """Loads a base mockup image into the PSD as background layer."""
        if not os.path.exists(template_path):
            raise FileNotFoundError(f"Template mockup not found at {template_path}")
        
        base_img = Image.open(template_path).convert("RGBA")
        if base_img.size != (self.width, self.height):
            base_img = base_img.resize((self.width, self.height), Image.Resampling.LANCZOS)
        
        self.add_artwork_layer(
            image=base_img,
            name="T-Shirt Mockup Background",
            top=0,
            left=0,
            opacity=255,
            visible=True
        )

    def add_artwork_layer(
        self,
        image: Image.Image,
        name: str,
        top: int,
        left: int,
        opacity: int = 255,
        visible: bool = True
    ):
        """Adds an RGBA image layer with specified top/left bounds."""
        rgba = image.convert("RGBA")
        w, h = rgba.size
        
        # Clamp bounds to canvas
        clamped_top = max(0, min(self.height, top))
        clamped_left = max(0, min(self.width, left))
        
        r, g, b, a = rgba.split()
        r_arr = np.ascontiguousarray(np.array(r, dtype=np.uint8))
        g_arr = np.ascontiguousarray(np.array(g, dtype=np.uint8))
        b_arr = np.ascontiguousarray(np.array(b, dtype=np.uint8))
        a_arr = np.ascontiguousarray(np.array(a, dtype=np.uint8))
        
        # pytoshop channel dictionary: 0: R, 1: G, 2: B, -1: Alpha
        channel_dict = {
            0: layers.ChannelImageData(image=r_arr, compression=0),
            1: layers.ChannelImageData(image=g_arr, compression=0),
            2: layers.ChannelImageData(image=b_arr, compression=0),
            -1: layers.ChannelImageData(image=a_arr, compression=0),
        }
        
        layer_rec = layers.LayerRecord(
            name=name,
            top=clamped_top,
            left=clamped_left,
            bottom=clamped_top + h,
            right=clamped_left + w,
            channels=channel_dict,
            blend_mode=b'norm',
            opacity=opacity,
            visible=visible
        )
        
        self.layers_list.append(layer_rec)
        
        # Also update composite image for fast preview export
        self._composite_image.paste(rgba, (clamped_left, clamped_top), rgba)

    def export_psd(self, output_path: str) -> str:
        """Writes the Photoshop PSD file to disk and returns the absolute path."""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        
        # Add all layers to PSD structure
        self.psd.layer_and_mask_info.layer_info.layer_records = self.layers_list
        
        with open(output_path, "wb") as f:
            self.psd.write(f)
            
        return output_path

    def export_preview_png(self, output_path: str, max_size: int = 1200) -> str:
        """Exports a composite preview PNG."""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        w, h = self._composite_image.size
        ratio = max_size / float(max(w, h))
        preview_size = (int(w * ratio), int(h * ratio))
        resized = self._composite_image.resize(preview_size, Image.Resampling.LANCZOS)
        resized.save(output_path, "PNG", optimize=True)
        return output_path
