import os
import uuid
from typing import Dict, Any, Optional, Tuple
import numpy as np
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
BLENDING_DIR = os.path.join(STORAGE_DIR, "blending")
ORIGINALS_DIR = os.path.join(BLENDING_DIR, "originals")
PREVIEWS_DIR = os.path.join(BLENDING_DIR, "previews")
OUTPUTS_DIR = os.path.join(BLENDING_DIR, "outputs")

os.makedirs(ORIGINALS_DIR, exist_ok=True)
os.makedirs(PREVIEWS_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)


class DesignBlender:
    """
    Dedicated image-processing service for Photoshop-style pixel blending
    between background/garment images and artwork designs.
    """

    @staticmethod
    def analyze_background_luminance(bg_img: Image.Image) -> Dict[str, Any]:
        """
        Analyzes the background image's center/garment region to determine
        whether it is LIGHT, DARK, or MIXED, and recommends an optimal blend mode.
        """
        img_rgba = bg_img.convert("RGBA")
        w, h = img_rgba.size

        # Extract central 50% ROI
        left = int(w * 0.25)
        top = int(h * 0.25)
        right = int(w * 0.75)
        bottom = int(h * 0.75)

        roi = img_rgba.crop((left, top, right, bottom))
        arr = np.array(roi, dtype=np.float32)

        # Consider pixels with non-transparent alpha
        alpha = arr[:, :, 3]
        valid_mask = alpha > 25

        if np.any(valid_mask):
            rgb = arr[valid_mask, :3]
        else:
            rgb = arr[:, :, :3].reshape(-1, 3)

        # Standard ITU-R BT.601 perceptual luminance
        lum = 0.299 * rgb[:, 0] + 0.587 * rgb[:, 1] + 0.114 * rgb[:, 2]
        mean_lum = float(np.mean(lum))
        std_lum = float(np.std(lum))

        # Classification thresholds
        if mean_lum >= 150.0:
            classification = "LIGHT"
            recommended = "multiply"
            explanation = "Light background detected. Multiply blend mode is recommended for dark inks/graphics."
        elif mean_lum <= 95.0:
            classification = "DARK"
            recommended = "screen"
            explanation = "Dark background detected. Screen blend mode is recommended for light inks/graphics."
        else:
            classification = "MIXED"
            recommended = "normal"
            explanation = "Mixed / uncertain background tone. Soft Light or Multiply/Screen can be chosen based on design."

        return {
            "luminance": round(mean_lum, 2),
            "std_deviation": round(std_lum, 2),
            "classification": classification,
            "recommended_mode": recommended,
            "explanation": explanation
        }

    @staticmethod
    def calculate_blend_mode(base_rgb: np.ndarray, art_rgb: np.ndarray, mode: str) -> np.ndarray:
        """
        Computes the pixel-level blend mode math.
        base_rgb, art_rgb: float32 arrays in [0.0, 1.0], shape (H, W, 3).
        Returns blended_rgb: float32 array in [0.0, 1.0].
        """
        m = (mode or "normal").lower().replace(" ", "_")

        if m == "multiply":
            return base_rgb * art_rgb

        elif m == "screen":
            return 1.0 - (1.0 - base_rgb) * (1.0 - art_rgb)

        elif m == "overlay":
            return np.where(
                base_rgb < 0.5,
                2.0 * base_rgb * art_rgb,
                1.0 - 2.0 * (1.0 - base_rgb) * (1.0 - art_rgb)
            )

        elif m == "soft_light":
            # W3C standard soft-light formula
            def d_func(b):
                return np.where(
                    b <= 0.25,
                    ((16.0 * b - 12.0) * b + 4.0) * b,
                    np.sqrt(np.clip(b, 0.0, 1.0))
                )

            d_base = d_func(base_rgb)
            return np.where(
                art_rgb <= 0.5,
                base_rgb - (1.0 - 2.0 * art_rgb) * base_rgb * (1.0 - base_rgb),
                base_rgb + (2.0 * art_rgb - 1.0) * (d_base - base_rgb)
            )

        elif m == "hard_light":
            # Hard light is overlay with roles of base and blend reversed
            return np.where(
                art_rgb < 0.5,
                2.0 * base_rgb * art_rgb,
                1.0 - 2.0 * (1.0 - base_rgb) * (1.0 - art_rgb)
            )

        elif m == "darken":
            return np.minimum(base_rgb, art_rgb)

        elif m == "lighten":
            return np.maximum(base_rgb, art_rgb)

        elif m == "color_burn":
            eps = 1e-6
            val = 1.0 - (1.0 - base_rgb) / (art_rgb + eps)
            return np.clip(np.where(art_rgb <= 0.0, 0.0, val), 0.0, 1.0)

        elif m == "color_dodge":
            eps = 1e-6
            val = base_rgb / (1.0 - art_rgb + eps)
            return np.clip(np.where(art_rgb >= 1.0, 1.0, val), 0.0, 1.0)

        elif m == "color":
            # Preserves base luminance while taking hue and chroma from artwork
            base_lum = 0.299 * base_rgb[:, :, 0] + 0.587 * base_rgb[:, :, 1] + 0.114 * base_rgb[:, :, 2]
            art_lum = 0.299 * art_rgb[:, :, 0] + 0.587 * art_rgb[:, :, 1] + 0.114 * art_rgb[:, :, 2]
            lum_diff = base_lum - art_lum
            res = art_rgb + np.expand_dims(lum_diff, axis=-1)
            return np.clip(res, 0.0, 1.0)

        else: # "normal"
            return art_rgb

    @staticmethod
    def transform_artwork(
        artwork_img: Image.Image,
        target_width: Optional[int] = None,
        target_height: Optional[int] = None,
        scale: float = 1.0,
        rotation: float = 0.0
    ) -> Image.Image:
        """
        Resizes, scales, and rotates the artwork image cleanly in RGBA mode.
        """
        art = artwork_img.convert("RGBA")
        orig_w, orig_h = art.size

        # 1. Base resize
        new_w = target_width if (target_width and target_width > 0) else orig_w
        new_h = target_height if (target_height and target_height > 0) else orig_h

        # 2. Scale multiplier
        s = max(0.05, min(5.0, float(scale)))
        scaled_w = max(1, int(round(new_w * s)))
        scaled_h = max(1, int(round(new_h * s)))

        if (scaled_w, scaled_h) != (orig_w, orig_h):
            art = art.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)

        # 3. Rotation
        rot = float(rotation)
        if rot != 0.0:
            # Pillow rotates counter-clockwise for positive values; standard GUI rotation is clockwise
            art = art.rotate(-rot, expand=True, resample=Image.Resampling.BICUBIC)

        return art

    @classmethod
    def blend_layers(
        cls,
        bg_img: Image.Image,
        art_img: Image.Image,
        x: int = 0,
        y: int = 0,
        target_width: Optional[int] = None,
        target_height: Optional[int] = None,
        scale: float = 1.0,
        rotation: float = 0.0,
        blend_mode: str = "normal",
        blend_strength: float = 100.0,
        opacity: float = 100.0
    ) -> Image.Image:
        """
        Composites artwork onto background image using true pixel-based blending math.
        Guarantees:
        - Transparent PNG pixels never affect background (no unwanted white box)
        - Background texture and colors show through blend modes correctly
        - Blend strength (0-100%) smoothly interpolates with normal appearance
        - Opacity (0-100%) attenuates artwork alpha cleanly
        """
        bg = bg_img.convert("RGBA")
        transformed_art = cls.transform_artwork(
            artwork_img=art_img,
            target_width=target_width,
            target_height=target_height,
            scale=scale,
            rotation=rotation
        )

        bg_w, bg_h = bg.size
        art_w, art_h = transformed_art.size

        # Intersection bounds between background and artwork placement
        x0 = max(0, x)
        y0 = max(0, y)
        x1 = min(bg_w, x + art_w)
        y1 = min(bg_h, y + art_h)

        if x1 <= x0 or y1 <= y0:
            # Artwork completely outside canvas
            return bg.copy()

        # Artwork ROI coordinates
        art_x0 = x0 - x
        art_y0 = y0 - y
        art_x1 = art_x0 + (x1 - x0)
        art_y1 = art_y0 + (y1 - y0)

        bg_roi_img = bg.crop((x0, y0, x1, y1))
        art_roi_img = transformed_art.crop((art_x0, art_y0, art_x1, art_y1))

        bg_roi = np.array(bg_roi_img, dtype=np.float32)
        art_roi = np.array(art_roi_img, dtype=np.float32)

        # Normalize to [0.0, 1.0]
        bg_rgb = bg_roi[:, :, :3] / 255.0
        bg_a = bg_roi[:, :, 3] / 255.0
        art_rgb = art_roi[:, :, :3] / 255.0
        art_a = (art_roi[:, :, 3] / 255.0) * (max(0.0, min(100.0, float(opacity))) / 100.0)

        # Compute selected blend mode
        blended_rgb = cls.calculate_blend_mode(bg_rgb, art_rgb, blend_mode)

        # Apply blend strength (0% = normal artwork, 100% = full blend effect)
        b_strength = max(0.0, min(100.0, float(blend_strength))) / 100.0
        effective_rgb = (1.0 - b_strength) * art_rgb + b_strength * blended_rgb
        effective_rgb = np.clip(effective_rgb, 0.0, 1.0)

        # Porter-Duff source-over compositing with alpha channel preservation
        art_a_expanded = np.expand_dims(art_a, axis=-1)
        comp_rgb = (effective_rgb * art_a_expanded) + (bg_rgb * (1.0 - art_a_expanded))
        comp_alpha = art_a + bg_a * (1.0 - art_a)

        comp_roi = np.zeros_like(bg_roi)
        comp_roi[:, :, :3] = np.clip(comp_rgb * 255.0, 0.0, 255.0)
        comp_roi[:, :, 3] = np.clip(comp_alpha * 255.0, 0.0, 255.0)

        result = bg.copy()
        roi_pil = Image.fromarray(comp_roi.astype(np.uint8), mode="RGBA")
        result.paste(roi_pil, (x0, y0), roi_pil)

        return result

    @classmethod
    def generate_preview(
        cls,
        bg_img: Image.Image,
        art_img: Image.Image,
        x: int,
        y: int,
        target_width: Optional[int],
        target_height: Optional[int],
        scale: float,
        rotation: float,
        blend_mode: str,
        blend_strength: float,
        opacity: float,
        max_preview_dim: int = 1000
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Creates a fast, downscaled preview of the blend operation.
        Returns (preview_relative_url, analysis_dict).
        """
        orig_w, orig_h = bg_img.size
        ratio = min(1.0, float(max_preview_dim) / float(max(orig_w, orig_h)))

        # Downscale background for preview
        prev_w = max(1, int(round(orig_w * ratio)))
        prev_h = max(1, int(round(orig_h * ratio)))
        bg_scaled = bg_img.resize((prev_w, prev_h), Image.Resampling.LANCZOS)

        # Scale coordinates and dimensions proportionally
        scaled_x = int(round(x * ratio))
        scaled_y = int(round(y * ratio))
        scaled_art_w = int(round(target_width * ratio)) if target_width else None
        scaled_art_h = int(round(target_height * ratio)) if target_height else None

        # Execute blending using exact same algorithm
        blended_preview = cls.blend_layers(
            bg_img=bg_scaled,
            art_img=art_img,
            x=scaled_x,
            y=scaled_y,
            target_width=scaled_art_w,
            target_height=scaled_art_h,
            scale=scale,
            rotation=rotation,
            blend_mode=blend_mode,
            blend_strength=blend_strength,
            opacity=opacity
        )

        filename = f"preview_blend_{uuid.uuid4().hex[:12]}.png"
        filepath = os.path.join(PREVIEWS_DIR, filename)
        blended_preview.save(filepath, "PNG", optimize=True)

        analysis = cls.analyze_background_luminance(bg_img)

        return f"/storage/blending/previews/{filename}", analysis

    @classmethod
    def export_final_png(
        cls,
        bg_img: Image.Image,
        art_img: Image.Image,
        x: int,
        y: int,
        target_width: Optional[int],
        target_height: Optional[int],
        scale: float,
        rotation: float,
        blend_mode: str,
        blend_strength: float,
        opacity: float
    ) -> Tuple[str, int, int, int]:
        """
        Generates full-resolution blended PNG matching original background dimensions.
        Returns: (output_filepath, width, height, file_size_bytes)
        """
        final_img = cls.blend_layers(
            bg_img=bg_img,
            art_img=art_img,
            x=x,
            y=y,
            target_width=target_width,
            target_height=target_height,
            scale=scale,
            rotation=rotation,
            blend_mode=blend_mode,
            blend_strength=blend_strength,
            opacity=opacity
        )

        filename = f"blended_{uuid.uuid4().hex[:12]}.png"
        filepath = os.path.join(OUTPUTS_DIR, filename)
        final_img.save(filepath, "PNG", optimize=True)

        w, h = final_img.size
        size_bytes = os.path.getsize(filepath)

        return filepath, w, h, size_bytes
