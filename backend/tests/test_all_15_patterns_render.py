import os
import pytest
from PIL import Image
import numpy as np
from app.services.png_processor import PNGProcessor
from app.database.connection import SessionLocal
from app.models.pattern import Pattern
from app.services.design_service import DesignService
from app.models.design_job import Artwork

ALL_15_PATTERN_IDS = [
    "front_left_chest",
    "front_center_small",
    "front_center_large",
    "front_full",
    "back_center",
    "back_full",
    "small_front_full_back",
    "front_center_back_full",
    "front_full_back_full",
    "front_small_back_center",
    "front_typography_back_graphic",
    "back_only",
    "front_only",
    "small_logo_front_large_graphic_back",
    "custom_front_custom_back"
]

@pytest.fixture(scope="module")
def sample_artworks():
    sample_art_path = r"c:\TSHIRTS\templates\extracted\4_NARUTO_1.png"
    assert os.path.exists(sample_art_path), "Sample artwork must exist"

    with open(sample_art_path, "rb") as f:
        bytes_data = f.read()

    db = SessionLocal()
    try:
        res1 = DesignService.save_uploaded_artwork(bytes_data, "test_front.png", db)
        res2 = DesignService.save_uploaded_artwork(bytes_data, "test_back.png", db)
        return res1["artwork_id"], res2["artwork_id"]
    finally:
        db.close()

def test_database_contains_all_15_patterns():
    db = SessionLocal()
    try:
        patterns = db.query(Pattern).all()
        existing_ids = {p.pattern_id for p in patterns}
        for pid in ALL_15_PATTERN_IDS:
            assert pid in existing_ids, f"Pattern '{pid}' must exist in database"
    finally:
        db.close()

@pytest.mark.parametrize("pattern_id", ALL_15_PATTERN_IDS)
def test_render_pattern_production_and_mockup(pattern_id, sample_artworks):
    front_id, back_id = sample_artworks
    db = SessionLocal()
    try:
        pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
        assert pattern is not None, f"Pattern {pattern_id} not found"

        req_uploads = pattern.get_required_uploads()
        f_id = front_id if "front" in req_uploads else None
        b_id = back_id if "back" in req_uploads else None

        # 1. Generate Print-Ready 2x2 PNG (generates both production and mockup)
        job = DesignService.generate_print_ready_png(
            color="Black",
            style="Oversized",
            pattern_id=pattern_id,
            front_artwork_id=f_id,
            back_artwork_id=b_id,
            transforms={
                "front": {"scale_multiplier": 1.0, "offset_x": 0.0, "offset_y": 0.0, "rotation": 0.0},
                "back": {"scale_multiplier": 1.0, "offset_x": 0.0, "offset_y": 0.0, "rotation": 0.0}
            },
            mockup_params={
                "fold_depth": 0.5,
                "displacement": 0.4,
                "texture_intensity": 0.3,
                "shadow_intensity": 0.4,
                "blend_mode": "auto"
            },
            db=db
        )

        assert job.status == "completed"
        assert job.canvas_width == 5400
        assert job.canvas_height == 5286
        assert os.path.exists(job.output_png_path), f"Production PNG must exist for {pattern_id}"
        assert job.output_mockup_png_path is not None
        assert os.path.exists(job.output_mockup_png_path), f"Mockup PNG must exist for {pattern_id}"

        # Verify image sizes
        with Image.open(job.output_png_path) as prod_img:
            assert prod_img.size == (5400, 5286)
        with Image.open(job.output_mockup_png_path) as mock_img:
            assert mock_img.size == (5400, 5286)

        # 2. Test 2x2 Preview endpoint generation in both flat and realistic mode
        flat_preview = DesignService.generate_2x2_preview(
            pattern_id=pattern_id,
            front_artwork_id=f_id,
            back_artwork_id=b_id,
            mode="flat",
            db=db
        )
        assert flat_preview.startswith("/preview/")

        realistic_preview = DesignService.generate_2x2_preview(
            pattern_id=pattern_id,
            front_artwork_id=f_id,
            back_artwork_id=b_id,
            mode="realistic",
            db=db
        )
        assert realistic_preview.startswith("/preview/")

    finally:
        db.close()
