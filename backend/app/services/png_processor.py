import os
from typing import Tuple, Dict, Any, Optional
from PIL import Image, ImageDraw, ImageFont
from app.services.mockup_blender import MockupBlender

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
TEMPLATES_EXTRACTED_DIR = os.path.join(BASE_DIR, "templates", "extracted")

# Source template asset mapping
TEMPLATE_FILES = {
    "black_front": "0_blk_frnt.png",
    "white_front": "1_wht_frnt.png",
    "black_back": "2_blk_bg.png",
    "white_back": "3_wht_bg.png",
}

TEMPLATE_WIDTH = 2700
TEMPLATE_HEIGHT = 2643
FINAL_CANVAS_WIDTH = 5400
FINAL_CANVAS_HEIGHT = 5286


class PNGProcessor:
    """
    Dedicated production-ready image processor for compiling 2x2 high-resolution
    T-shirt composite sheets (5400 x 5286 px) from authentic template assets.
    """

    @staticmethod
    def get_template_path(view_key: str) -> str:
        """
        Returns the absolute filepath for an extracted template asset.
        view_key: 'black_front', 'white_front', 'black_back', 'white_back'
        """
        filename = TEMPLATE_FILES.get(view_key.lower())
        if not filename:
            raise ValueError(f"Unknown template view key: {view_key}. Expected one of {list(TEMPLATE_FILES.keys())}")
        
        filepath = os.path.join(TEMPLATES_EXTRACTED_DIR, filename)
        if not os.path.exists(filepath):
            # Fallback to templates/mockups if extracted is missing
            alt_filename = f"{view_key.lower()}.png"
            alt_filepath = os.path.join(BASE_DIR, "templates", "mockups", alt_filename)
            if os.path.exists(alt_filepath):
                return alt_filepath
            raise FileNotFoundError(f"Template asset not found at {filepath} or {alt_filepath}")
        return filepath

    @staticmethod
    def load_template(view_key: str) -> Image.Image:
        """
        Loads the 2700x2643 source T-shirt template in RGBA mode.
        """
        path = PNGProcessor.get_template_path(view_key)
        img = Image.open(path).convert("RGBA")
        if img.size != (TEMPLATE_WIDTH, TEMPLATE_HEIGHT):
            img = img.resize((TEMPLATE_WIDTH, TEMPLATE_HEIGHT), Image.Resampling.LANCZOS)
        return img

    @staticmethod
    def load_artwork(file_path: str) -> Image.Image:
        """
        Loads an uploaded artwork image and converts to RGBA mode,
        preserving existing alpha transparency and avoiding white box artifacts.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Artwork file not found at: {file_path}")
        
        with Image.open(file_path) as raw_img:
            # Handle palette images with transparency properly
            if raw_img.mode == "P":
                return raw_img.convert("RGBA")
            elif raw_img.mode in ("RGBA", "LA"):
                return raw_img.convert("RGBA")
            else:
                # RGB or Grayscale - convert to RGBA
                return raw_img.convert("RGBA")

    @staticmethod
    def resize_artwork(
        artwork_img: Image.Image,
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
        Resizes and transforms artwork according to print zone geometry and fit rules.
        Returns: (transformed_image, final_width, final_height, rel_x, rel_y)
        where rel_x, rel_y are placement coordinates relative to zone (x, y).
        """
        orig_w, orig_h = artwork_img.size
        usable_w = max(10.0, target_width - (safe_margin * 2.0))
        usable_h = max(10.0, target_height - (safe_margin * 2.0))

        mode = (fit_mode or "contain").lower()
        scale = max(0.01, float(scale_multiplier))

        if mode == "contain":
            # Scale proportionally so the artwork completely fits inside usable bounds
            ratio = min(usable_w / float(orig_w), usable_h / float(orig_h)) * scale
            new_w = max(1, int(round(orig_w * ratio)))
            new_h = max(1, int(round(orig_h * ratio)))
            transformed = artwork_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        elif mode == "cover":
            # Scale to fill entire bounds, then crop center
            ratio = max(usable_w / float(orig_w), usable_h / float(orig_h)) * scale
            scaled_w = max(1, int(round(orig_w * ratio)))
            scaled_h = max(1, int(round(orig_h * ratio)))
            scaled = artwork_img.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)
            left = (scaled_w - usable_w) / 2.0
            top = (scaled_h - usable_h) / 2.0
            transformed = scaled.crop((int(left), int(top), int(left + usable_w), int(top + usable_h)))
            new_w, new_h = transformed.size
        elif mode == "stretch":
            # Stretch directly to usable width and height
            new_w = max(1, int(round(usable_w * scale)))
            new_h = max(1, int(round(usable_h * scale)))
            transformed = artwork_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        elif mode == "original":
            # Native size scaled only by user multiplier
            new_w = max(1, int(round(orig_w * scale)))
            new_h = max(1, int(round(orig_h * scale)))
            transformed = artwork_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        else: # custom or fallback to contain
            ratio = min(usable_w / float(orig_w), usable_h / float(orig_h)) * scale
            new_w = max(1, int(round(orig_w * ratio)))
            new_h = max(1, int(round(orig_h * ratio)))
            transformed = artwork_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        # Apply rotation if specified
        if rotation_degrees != 0.0:
            transformed = transformed.rotate(-rotation_degrees, expand=True, resample=Image.Resampling.BICUBIC)
            new_w, new_h = transformed.size

        # Center inside usable zone area, then add user offset
        rel_x = int(round(safe_margin + ((usable_w - new_w) / 2.0) + offset_x))
        rel_y = int(round(safe_margin + ((usable_h - new_h) / 2.0) + offset_y))

        return transformed, new_w, new_h, rel_x, rel_y

    @staticmethod
    def composite_artwork(shirt_img: Image.Image, artwork_img: Image.Image, x: int, y: int) -> Image.Image:
        """
        Alpha-composites the artwork image cleanly onto the shirt template image.
        Modifies and returns the composited shirt image.
        """
        # Create a blank RGBA layer of the shirt's size to paste artwork at (x, y)
        overlay = Image.new("RGBA", shirt_img.size, (0, 0, 0, 0))
        overlay.paste(artwork_img, (x, y), artwork_img)
        
        # Alpha composite cleanly preserving transparency
        return Image.alpha_composite(shirt_img, overlay)

    @staticmethod
    def render_shirt_view(
        view_key: str,
        artwork_img: Optional[Image.Image] = None,
        zone_coords: Optional[Dict[str, Any]] = None,
        transform: Optional[Dict[str, Any]] = None,
        realistic: bool = False,
        mockup_params: Optional[Dict[str, Any]] = None
    ) -> Image.Image:
        """
        Renders a single 2700x2643 shirt view with artwork properly positioned if supplied.
        view_key: 'black_front', 'white_front', 'black_back', 'white_back'
        When realistic=True, applies authentic fabric fold/crease shading, texture, and subtle displacement.
        """
        shirt = PNGProcessor.load_template(view_key)
        
        if artwork_img is not None and zone_coords is not None:
            zone_x = float(zone_coords.get("x", 864))
            zone_y = float(zone_coords.get("y", 640))
            zone_w = float(zone_coords.get("width", 970))
            zone_h = float(zone_coords.get("height", 1451))
            safe_margin = float(zone_coords.get("safe_margin", 20.0))
            default_fit = zone_coords.get("fit_mode", "contain")

            tf = transform or {}
            fit_mode = tf.get("fit_mode", default_fit)
            scale_mult = float(tf.get("scale_multiplier", 1.0))
            rotation_deg = float(tf.get("rotation", 0.0))
            offset_x = float(tf.get("offset_x", 0.0))
            offset_y = float(tf.get("offset_y", 0.0))

            transformed_art, _, _, rel_x, rel_y = PNGProcessor.resize_artwork(
                artwork_img=artwork_img,
                target_width=zone_w,
                target_height=zone_h,
                fit_mode=fit_mode,
                safe_margin=safe_margin,
                scale_multiplier=scale_mult,
                rotation_degrees=rotation_deg,
                offset_x=offset_x,
                offset_y=offset_y
            )

            abs_x = int(round(zone_x + rel_x))
            abs_y = int(round(zone_y + rel_y))

            if realistic:
                mp = mockup_params or {}
                shirt = MockupBlender.blend_artwork(
                    shirt_img=shirt,
                    artwork_img=transformed_art,
                    x=abs_x,
                    y=abs_y,
                    blend_strength=float(mp.get("blend_strength", 80.0)),
                    print_opacity=float(mp.get("print_opacity", 100.0)),
                    fabric_deformation=float(mp.get("fabric_deformation", 25.0)),
                    fabric_texture=float(mp.get("fabric_texture", 40.0)),
                    shading_strength=float(mp.get("shading_strength", 50.0)),
                    blend_mode=mp.get("blend_mode", "auto")
                )
            else:
                shirt = PNGProcessor.composite_artwork(shirt, transformed_art, abs_x, abs_y)

        return shirt

    @staticmethod
    def create_2x2_sheet(
        black_front: Image.Image,
        black_back: Image.Image,
        white_front: Image.Image,
        white_back: Image.Image,
        include_labels: bool = False
    ) -> Image.Image:
        """
        Creates the 2x2 sheet with resolution dynamically calculated from actual template assets:
        canvas_width = black_front.width + black_back.width (e.g. 5400 px)
        canvas_height = black_front.height + white_front.height (e.g. 5286 px)
        TOP LEFT:     Black Front (x=0, y=0)
        TOP RIGHT:    Black Back  (x=black_front.width, y=0)
        BOTTOM LEFT:  White Front (x=0, y=black_front.height)
        BOTTOM RIGHT: White Back  (x=black_front.width, y=black_front.height)
        Preserves alpha/transparency.
        """
        top_w = black_front.width + black_back.width
        bottom_w = white_front.width + white_back.width
        canvas_w = max(top_w, bottom_w)

        left_h = black_front.height + white_front.height
        right_h = black_back.height + white_back.height
        canvas_h = max(left_h, right_h)

        sheet = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))

        # Paste views at exact pixel offsets
        # Top-Left: Black Front
        sheet.paste(black_front, (0, 0), black_front)

        # Top-Right: Black Back
        sheet.paste(black_back, (black_front.width, 0), black_back)

        # Bottom-Left: White Front
        sheet.paste(white_front, (0, black_front.height), white_front)

        # Bottom-Right: White Back
        sheet.paste(white_back, (black_front.width, black_front.height), white_back)

        if include_labels:
            draw = ImageDraw.Draw(sheet)
            # Default or simple fallback font
            try:
                font = ImageFont.truetype("arial.ttf", 48)
            except Exception:
                font = ImageFont.load_default()

            label_color = (128, 128, 128, 200) # Subtle gray
            # Top-Left: BLACK FRONT
            draw.text((80, 80), "BLACK FRONT", fill=label_color, font=font)
            # Top-Right: BLACK BACK
            draw.text((TEMPLATE_WIDTH + 80, 80), "BLACK BACK", fill=label_color, font=font)
            # Bottom-Left: WHITE FRONT
            draw.text((80, TEMPLATE_HEIGHT + 80), "WHITE FRONT", fill=label_color, font=font)
            # Bottom-Right: WHITE BACK
            draw.text((TEMPLATE_WIDTH + 80, TEMPLATE_HEIGHT + 80), "WHITE BACK", fill=label_color, font=font)

        return sheet

    @staticmethod
    def export_png(image: Image.Image, output_path: str, optimize: bool = True) -> str:
        """
        Saves image as RGBA PNG at maximum lossless fidelity.
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        image.save(output_path, "PNG", optimize=optimize)
        return output_path

    @staticmethod
    def export_web_preview(image: Image.Image, output_path: str, max_width: int = 1600) -> str:
        """
        Exports a high-performance web-scaled version of the 2x2 sheet
        for instant browser preview matching the production render 1:1.
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        w, h = image.size
        ratio = float(max_width) / float(w)
        preview_size = (max_width, int(round(h * ratio)))
        preview_img = image.resize(preview_size, Image.Resampling.LANCZOS)
        preview_img.save(output_path, "PNG", optimize=True)
        return output_path
