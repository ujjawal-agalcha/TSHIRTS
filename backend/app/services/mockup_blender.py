import os
from typing import Dict, Any, Optional, Tuple
import numpy as np
from PIL import Image
# pyrefly: ignore [missing-import]
import cv2
# pyrefly: ignore [missing-import]

class MockupBlender:
    """
    Dedicated local image-processing service for generating photorealistic T-shirt mockups.
    Simulates authentic DTG/screen-print fabric integration:
    - Analyzes base shirt luminance, shadows, and highlights
    - Generates fold/crease displacement (subtle deformation)
    - Integrates micro-texture (cotton grain) into the ink
    - Modulates artwork colors with realistic lighting interaction
    - Preserves base shirt colors and sharp transparency with no white box artifacts
    """

    @staticmethod
    def blend_artwork(
        shirt_img: Image.Image,
        artwork_img: Image.Image,
        x: int,
        y: int,
        blend_strength: float = 80.0,
        print_opacity: float = 100.0,
        fabric_deformation: float = 25.0,
        fabric_texture: float = 40.0,
        shading_strength: float = 50.0,
        blend_mode: str = "auto"
    ) -> Image.Image:
        """
        Blends artwork onto shirt image with realistic fabric interaction.
        Returns a new PIL RGBA image representing the realistic mockup view.
        Original shirt_img and artwork_img are not permanently modified.
        """
        if shirt_img.mode != "RGBA":
            shirt_img = shirt_img.convert("RGBA")
        if artwork_img.mode != "RGBA":
            artwork_img = artwork_img.convert("RGBA")

        shirt_w, shirt_h = shirt_img.size
        art_w, art_h = artwork_img.size

        # Compute intersection bounding box between shirt and artwork placement
        x0 = max(0, x)
        y0 = max(0, y)
        x1 = min(shirt_w, x + art_w)
        y1 = min(shirt_h, y + art_h)

        if x1 <= x0 or y1 <= y0:
            # Artwork completely outside canvas
            return shirt_img.copy()

        # Artwork local crop coordinates
        art_x0 = x0 - x
        art_y0 = y0 - y
        art_x1 = art_x0 + (x1 - x0)
        art_y1 = art_y0 + (y1 - y0)

        # Extract shirt ROI and artwork ROI
        shirt_roi_img = shirt_img.crop((x0, y0, x1, y1))
        art_roi_img = artwork_img.crop((art_x0, art_y0, art_x1, art_y1))

        shirt_roi = np.array(shirt_roi_img, dtype=np.float32) # (H, W, 4)
        art_roi = np.array(art_roi_img, dtype=np.float32)     # (H, W, 4)

        roi_h, roi_w = art_roi.shape[:2]
        if roi_h == 0 or roi_w == 0:
            return shirt_img.copy()

        # 1. Analyze Shirt Surface Luminance
        shirt_rgb = shirt_roi[:, :, :3]
        shirt_lum = (0.299 * shirt_rgb[:, :, 0] + 0.587 * shirt_rgb[:, :, 1] + 0.114 * shirt_rgb[:, :, 2]) # 0..255

        # Check if shirt in this region is primarily dark or light
        valid_mask = shirt_roi[:, :, 3] > 20
        if np.any(valid_mask):
            mean_shirt_lum = float(np.mean(shirt_lum[valid_mask]))
        else:
            mean_shirt_lum = float(np.mean(shirt_lum))
        is_dark_shirt = mean_shirt_lum < 100.0

        # 2. Extract Low-Frequency Folds and High-Frequency Texture
        # Low-pass filter for folds
        ksize = max(5, int(min(roi_w, roi_h) * 0.08))
        if ksize % 2 == 0:
            ksize += 1
        sigma = max(1.0, ksize / 3.0)
        folds_lum = cv2.GaussianBlur(shirt_lum, (ksize, ksize), sigma)

        # High-pass filter for fabric weave / micro-texture
        texture_lum = shirt_lum - folds_lum

        # 3. Fabric Deformation / Displacement Mapping
        deform_factor = max(0.0, min(100.0, float(fabric_deformation)))
        art_alpha = art_roi[:, :, 3] / 255.0

        if deform_factor > 1.0 and roi_h > 10 and roi_w > 10:
            try:
                # Calculate fold gradients using Sobel operators
                grad_x = cv2.Sobel(folds_lum, cv2.CV_32F, 1, 0, ksize=3)
                grad_y = cv2.Sobel(folds_lum, cv2.CV_32F, 0, 1, ksize=3)

                std_x = np.std(grad_x) + 1e-4
                std_y = np.std(grad_y) + 1e-4

                # Subtle displacement: 0 to ~5 pixels max at 100%
                max_disp = (deform_factor / 100.0) * 4.5
                dx = (grad_x / std_x) * max_disp
                dy = (grad_y / std_y) * max_disp

                # Create coordinate meshgrid
                grid_y, grid_x = np.mgrid[0:roi_h, 0:roi_w].astype(np.float32)
                map_x = np.clip(grid_x + dx, 0, roi_w - 1).astype(np.float32)
                map_y = np.clip(grid_y + dy, 0, roi_h - 1).astype(np.float32)

                # Remap artwork RGBA channels
                art_deformed = np.zeros_like(art_roi)
                for c in range(4):
                    art_deformed[:, :, c] = cv2.remap(
                        art_roi[:, :, c],
                        map_x,
                        map_y,
                        interpolation=cv2.INTER_LINEAR,
                        borderMode=cv2.BORDER_CONSTANT,
                        borderValue=0
                    )
                art_roi = art_deformed
                art_alpha = art_roi[:, :, 3] / 255.0
            except Exception:
                pass # Gracefully fall back to original geometry if remap encounters issue

        # 4. Modulate Artwork Intensity & Shading
        b_strength = max(0.0, min(100.0, float(blend_strength))) / 100.0
        s_strength = max(0.0, min(100.0, float(shading_strength))) / 100.0
        t_strength = max(0.0, min(100.0, float(fabric_texture))) / 100.0
        p_opacity = max(0.0, min(100.0, float(print_opacity))) / 100.0

        # Normalized fold deviation (-1.0 to 1.0)
        fold_std = np.std(folds_lum) + 1e-4
        fold_norm = (folds_lum - np.mean(folds_lum)) / (2.0 * fold_std)
        fold_norm = np.clip(fold_norm, -1.0, 1.0)

        # Normalized texture variation (-1.0 to 1.0)
        tex_std = np.std(texture_lum) + 1e-4
        tex_norm = (texture_lum / (2.5 * tex_std))
        tex_norm = np.clip(tex_norm, -1.0, 1.0)

        # Combined modulation map
        surface_mod = (fold_norm * s_strength * 0.7) + (tex_norm * t_strength * 0.3)
        surface_mod = surface_mod * b_strength
        mod_3d = np.expand_dims(surface_mod, axis=-1) # Shape (H, W, 1) for clean broadcasting with (H, W, 3)

        # Modulate artwork RGB
        art_rgb = art_roi[:, :, :3] / 255.0 # normalized 0..1

        if is_dark_shirt:
            # On dark shirt: folds create specular sheen/highlights and crease lines
            # Highlights gently brighten ink; shadows subtly compress
            shaded_rgb = np.where(
                mod_3d < 0,
                art_rgb * (1.0 + mod_3d * 0.45),
                art_rgb + (1.0 - art_rgb) * (mod_3d * 0.35)
            )
        else:
            # On white shirt: folds create prominent soft shadows
            shaded_rgb = np.where(
                mod_3d < 0,
                art_rgb * (1.0 + mod_3d * 0.65),
                art_rgb + (1.0 - art_rgb) * (mod_3d * 0.20)
            )

        shaded_rgb = np.clip(shaded_rgb, 0.0, 1.0)

        # 5. Blend Modes
        mode = (blend_mode or "auto").lower()
        shirt_norm_rgb = shirt_rgb / 255.0

        if mode == "auto":
            if is_dark_shirt:
                # Soft blend preserving ink saturation while absorbing fold shadows
                blended_rgb = shaded_rgb
            else:
                # For light shirts, soft blend between modulated direct print and soft light
                soft_light = np.where(
                    shirt_norm_rgb <= 0.5,
                    2.0 * shaded_rgb * shirt_norm_rgb + (shaded_rgb ** 2.0) * (1.0 - 2.0 * shirt_norm_rgb),
                    2.0 * shaded_rgb * (1.0 - shirt_norm_rgb) + np.sqrt(shaded_rgb + 1e-6) * (2.0 * shirt_norm_rgb - 1.0)
                )
                blended_rgb = (1.0 - 0.35 * b_strength) * shaded_rgb + (0.35 * b_strength) * soft_light
        elif mode == "multiply":
            blended_rgb = shaded_rgb * shirt_norm_rgb
        elif mode == "overlay":
            blended_rgb = np.where(
                shirt_norm_rgb < 0.5,
                2.0 * shirt_norm_rgb * shaded_rgb,
                1.0 - 2.0 * (1.0 - shirt_norm_rgb) * (1.0 - shaded_rgb)
            )
        elif mode == "soft_light":
            blended_rgb = np.where(
                shirt_norm_rgb <= 0.5,
                2.0 * shaded_rgb * shirt_norm_rgb + (shaded_rgb ** 2.0) * (1.0 - 2.0 * shirt_norm_rgb),
                2.0 * shaded_rgb * (1.0 - shirt_norm_rgb) + np.sqrt(shaded_rgb + 1e-6) * (2.0 * shirt_norm_rgb - 1.0)
            )
        elif mode == "darken":
            blended_rgb = np.minimum(shaded_rgb, shirt_norm_rgb)
        elif mode == "screen":
            blended_rgb = 1.0 - (1.0 - shaded_rgb) * (1.0 - shirt_norm_rgb)
        else: # "normal"
            blended_rgb = shaded_rgb

        blended_rgb = np.clip(blended_rgb * 255.0, 0.0, 255.0)

        # 6. Natural Edge Feathering on Alpha Mask (Cotton Absorption)
        final_alpha = art_alpha * p_opacity
        if roi_h > 4 and roi_w > 4:
            try:
                # Subtle Gaussian blur on alpha edge to eliminate vector/sticker cut
                blurred_alpha = cv2.GaussianBlur(final_alpha, (3, 3), 0.5)
                final_alpha = 0.8 * final_alpha + 0.2 * blurred_alpha
            except Exception:
                pass

        # 7. Alpha-Composite onto Shirt ROI
        comp_roi = np.zeros_like(shirt_roi)
        art_a = np.expand_dims(final_alpha, axis=-1)

        # Composite RGB
        comp_roi[:, :, :3] = (blended_rgb * art_a) + (shirt_roi[:, :, :3] * (1.0 - art_a))
        # Keep original shirt alpha for boundary
        comp_roi[:, :, 3] = shirt_roi[:, :, 3]

        comp_roi = np.clip(comp_roi, 0, 255).astype(np.uint8)

        # Paste blended ROI back onto full shirt image
        result_img = shirt_img.copy()
        result_roi_pil = Image.fromarray(comp_roi, mode="RGBA")
        result_img.paste(result_roi_pil, (x0, y0))

        return result_img
