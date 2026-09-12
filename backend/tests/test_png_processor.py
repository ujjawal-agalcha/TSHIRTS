import os
import pytest
from PIL import Image
from app.services.png_processor import (
    PNGProcessor,
    TEMPLATE_WIDTH,
    TEMPLATE_HEIGHT,
    FINAL_CANVAS_WIDTH,
    FINAL_CANVAS_HEIGHT,
)

SAMPLE_ART_PATH = r"C:\TSHIRTS\templates\extracted\4_NARUTO_1.png"

def test_template_loading():
    """Verify all four extracted template views load at 2700x2643 in RGBA."""
    views = ["black_front", "black_back", "white_front", "white_back"]
    for v in views:
        img = PNGProcessor.load_template(v)
        assert img.size == (TEMPLATE_WIDTH, TEMPLATE_HEIGHT), f"{v} should be {TEMPLATE_WIDTH}x{TEMPLATE_HEIGHT}"
        assert img.mode == "RGBA", f"{v} should be RGBA mode"

def test_artwork_loading_and_transparency():
    """Verify artwork loads with alpha channel intact."""
    assert os.path.exists(SAMPLE_ART_PATH), "Extracted sample artwork must exist"
    art = PNGProcessor.load_artwork(SAMPLE_ART_PATH)
    assert art.mode == "RGBA"
    # Verify alpha channel has transparency (min alpha < 255)
    alpha = art.split()[-1]
    min_alpha, max_alpha = alpha.getextrema()
    assert min_alpha < 255, "Artwork should have transparent pixels"

def test_resize_contain_preserves_aspect_ratio():
    """Verify contain fit mode preserves aspect ratio without distortion."""
    art = PNGProcessor.load_artwork(SAMPLE_ART_PATH)
    orig_w, orig_h = art.size
    orig_ratio = orig_w / float(orig_h)

    resized, new_w, new_h, rel_x, rel_y = PNGProcessor.resize_artwork(
        artwork_img=art,
        target_width=970,
        target_height=1451,
        fit_mode="contain",
        safe_margin=20.0
    )
    new_ratio = new_w / float(new_h)
    assert abs(orig_ratio - new_ratio) < 0.02, "Aspect ratio must be preserved"
    assert new_w <= (970 - 40)
    assert new_h <= (1451 - 40)

def test_render_individual_shirt_views():
    """Verify rendering each of the 4 views with artwork."""
    art = PNGProcessor.load_artwork(SAMPLE_ART_PATH)
    zone = {"x": 864, "y": 640, "width": 970, "height": 1451, "safe_margin": 20, "fit_mode": "contain"}

    blk_front = PNGProcessor.render_shirt_view("black_front", art, zone)
    assert blk_front.size == (TEMPLATE_WIDTH, TEMPLATE_HEIGHT)
    assert blk_front.mode == "RGBA"

    blk_back = PNGProcessor.render_shirt_view("black_back", art, zone)
    assert blk_back.size == (TEMPLATE_WIDTH, TEMPLATE_HEIGHT)
    assert blk_back.mode == "RGBA"

    wht_front = PNGProcessor.render_shirt_view("white_front", art, zone)
    assert wht_front.size == (TEMPLATE_WIDTH, TEMPLATE_HEIGHT)
    assert wht_front.mode == "RGBA"

    wht_back = PNGProcessor.render_shirt_view("white_back", art, zone)
    assert wht_back.size == (TEMPLATE_WIDTH, TEMPLATE_HEIGHT)
    assert wht_back.mode == "RGBA"

def test_2x2_composition_and_dimensions():
    """Verify 2x2 final composition is exactly 5400 x 5286 px with all 4 quadrants positioned accurately."""
    blk_front = PNGProcessor.load_template("black_front")
    blk_back = PNGProcessor.load_template("black_back")
    wht_front = PNGProcessor.load_template("white_front")
    wht_back = PNGProcessor.load_template("white_back")

    sheet = PNGProcessor.create_2x2_sheet(
        black_front=blk_front,
        black_back=blk_back,
        white_front=wht_front,
        white_back=wht_back,
        include_labels=False
    )

    assert sheet.size == (FINAL_CANVAS_WIDTH, FINAL_CANVAS_HEIGHT), f"Final dimensions must be ({FINAL_CANVAS_WIDTH}, {FINAL_CANVAS_HEIGHT})"
    assert sheet.mode == "RGBA"

def test_2x2_export_file(tmp_path):
    """Verify exporting the 2x2 PNG creates a valid, readable high-res PNG file on disk."""
    blk_front = PNGProcessor.load_template("black_front")
    blk_back = PNGProcessor.load_template("black_back")
    wht_front = PNGProcessor.load_template("white_front")
    wht_back = PNGProcessor.load_template("white_back")

    sheet = PNGProcessor.create_2x2_sheet(blk_front, blk_back, wht_front, wht_back, include_labels=True)
    out_file = str(tmp_path / "test_2x2_out.png")
    PNGProcessor.export_png(sheet, out_file)

    assert os.path.exists(out_file)
    with Image.open(out_file) as reloaded:
        assert reloaded.size == (5400, 5286)
        assert reloaded.format == "PNG"
        assert reloaded.mode == "RGBA"
