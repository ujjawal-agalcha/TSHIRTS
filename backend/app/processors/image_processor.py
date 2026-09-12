import os
from PIL import Image, ImageOps
from typing import Tuple, Dict, Any, Optional

class ImageProcessor:
    @staticmethod
    def inspect_artwork(file_path: str) -> Dict[str, Any]:
        """
        Inspects an uploaded artwork file, checks dimensions, format, transparency,
        and estimates print DPI.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Artwork not found at {file_path}")
        
        with Image.open(file_path) as img:
            width, height = img.size
            format_name = img.format or "PNG"
            has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
            
            # Check if there is actual semi-transparent or transparent pixels
            is_transparent = False
            if has_alpha:
                rgba = img.convert("RGBA")
                alpha_channel = rgba.split()[-1]
                min_alpha, max_alpha = alpha_channel.getextrema()
                if min_alpha < 255:
                    is_transparent = True
            
            # Estimate physical size assuming 300 DPI print standard
            print_w_inches = width / 300.0
            print_h_inches = height / 300.0
            
            return {
                "width": width,
                "height": height,
                "format": format_name,
                "has_transparency": is_transparent,
                "aspect_ratio": round(width / float(height), 4) if height > 0 else 1.0,
                "print_size_300dpi_inches": (round(print_w_inches, 2), round(print_h_inches, 2)),
                "is_high_res": width >= 1200 or height >= 1200
            }

    @staticmethod
    def transform_artwork(
        artwork_path: str,
        target_width: float,
        target_height: float,
        fit_mode: str = "contain",
        safe_margin: float = 0.0,
        scale_multiplier: float = 1.0,
        rotation_degrees: float = 0.0,
        offset_x: float = 0.0,
        offset_y: float = 0.0
    ) -> Tuple[Image.Image, int, int, int, int]:
        """
        Transforms artwork according to zone boundaries and fit mode.
        Returns (transformed_pil_image, final_width, final_height, rel_x, rel_y)
        where rel_x, rel_y are offsets relative to the zone top-left corner.
        """
        img = Image.open(artwork_path).convert("RGBA")
        orig_w, orig_h = img.size
        
        # Apply safe margin
        usable_w = max(10, target_width - (safe_margin * 2))
        usable_h = max(10, target_height - (safe_margin * 2))
        
        fit_mode = (fit_mode or "contain").lower()
        
        if fit_mode == "contain":
            # Scale proportionally so the whole image fits in usable bounds
            ratio = min(usable_w / float(orig_w), usable_h / float(orig_h))
            new_w = max(1, int(orig_w * ratio * scale_multiplier))
            new_h = max(1, int(orig_h * ratio * scale_multiplier))
            resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        elif fit_mode == "cover":
            # Scale to completely fill the usable bounds, then crop center
            ratio = max(usable_w / float(orig_w), usable_h / float(orig_h)) * scale_multiplier
            temp_w = max(1, int(orig_w * ratio))
            temp_h = max(1, int(orig_h * ratio))
            scaled = img.resize((temp_w, temp_h), Image.Resampling.LANCZOS)
            # Crop to usable bounds
            left = (temp_w - usable_w) / 2
            top = (temp_h - usable_h) / 2
            resized = scaled.crop((left, top, left + usable_w, top + usable_h))
            new_w, new_h = resized.size
        elif fit_mode == "width":
            ratio = (usable_w / float(orig_w)) * scale_multiplier
            new_w = max(1, int(usable_w * scale_multiplier))
            new_h = max(1, int(orig_h * ratio))
            resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        elif fit_mode == "height":
            ratio = (usable_h / float(orig_h)) * scale_multiplier
            new_w = max(1, int(orig_w * ratio))
            new_h = max(1, int(usable_h * scale_multiplier))
            resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        elif fit_mode == "original":
            new_w = max(1, int(orig_w * scale_multiplier))
            new_h = max(1, int(orig_h * scale_multiplier))
            resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        else: # custom / default
            ratio = min(usable_w / float(orig_w), usable_h / float(orig_h))
            new_w = max(1, int(orig_w * ratio * scale_multiplier))
            new_h = max(1, int(orig_h * ratio * scale_multiplier))
            resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Apply rotation if any
        if rotation_degrees != 0.0:
            resized = resized.rotate(-rotation_degrees, expand=True, resample=Image.Resampling.BICUBIC)
            new_w, new_h = resized.size
            
        # Calculate centering within the zone + manual offset
        center_x = safe_margin + ((usable_w - new_w) / 2.0) + offset_x
        center_y = safe_margin + ((usable_h - new_h) / 2.0) + offset_y
        
        return resized, new_w, new_h, int(round(center_x)), int(round(center_y))
