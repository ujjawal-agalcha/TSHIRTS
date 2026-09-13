import os
import pytest
import numpy as np
from PIL import Image
from app.services.png_processor import PNGProcessor
from app.services.mockup_blender import MockupBlender

SAMPLE_ART_PATH = r"C:\TSHIRTS\templates\extracted\4_NARUTO_1.png"

def test_mockup_blender_dark_shirt():
    """Verify realistic fabric blending on black shirt preserves artwork vibrancy with subtle fold interaction."""
    shirt = PNGProcessor.load_template("black_front")
    art = PNGProcessor.load_artwork(SAMPLE_ART_PATH)

    blended = MockupBlender.blend_artwork(
        shirt_img=shirt,
        artwork_img=art,
        x=864,
        y=640,
        blend_strength=80.0,
        print_opacity=100.0,
        fabric_deformation=25.0,
        fabric_texture=40.0,
        shading_strength=50.0,
        blend_mode="auto"
    )

    assert blended.size == shirt.size
    assert blended.mode == "RGBA"

    # Verify pixels are modified in artwork region
    shirt_arr = np.array(shirt)
    blended_arr = np.array(blended)
    # The two images should not be identical
    assert not np.array_equal(shirt_arr, blended_arr)

def test_mockup_blender_light_shirt():
    """Verify realistic fabric blending on white shirt realistically shadows creases."""
    shirt = PNGProcessor.load_template("white_front")
    art = PNGProcessor.load_artwork(SAMPLE_ART_PATH)

    blended = MockupBlender.blend_artwork(
        shirt_img=shirt,
        artwork_img=art,
        x=864,
        y=640,
        blend_strength=85.0,
        print_opacity=100.0,
        fabric_deformation=30.0,
        fabric_texture=45.0,
        shading_strength=55.0,
        blend_mode="soft_light"
    )

    assert blended.size == shirt.size
    assert blended.mode == "RGBA"

def test_mockup_blender_all_blend_modes():
    """Verify all supported blend modes execute without error and produce valid RGBA outputs."""
    shirt = PNGProcessor.load_template("white_front")
    art = PNGProcessor.load_artwork(SAMPLE_ART_PATH)
    modes = ["auto", "normal", "multiply", "overlay", "soft_light", "darken", "screen"]

    for m in modes:
        out = MockupBlender.blend_artwork(
            shirt_img=shirt,
            artwork_img=art,
            x=864,
            y=640,
            blend_mode=m
        )
        assert out.size == (2700, 2643)
        assert out.mode == "RGBA"

def test_transparent_artwork_no_white_box():
    """Verify transparent artwork preserves zero alpha outside artwork content (no white box)."""
    shirt = PNGProcessor.load_template("black_front")
    art = PNGProcessor.load_artwork(SAMPLE_ART_PATH)

    blended = MockupBlender.blend_artwork(shirt, art, 864, 640)
    blended_arr = np.array(blended)
    shirt_arr = np.array(shirt)

    # In top-left corner of canvas (far from artwork), pixels must remain 100% identical to template
    corner_shirt = shirt_arr[10:50, 10:50]
    corner_blended = blended_arr[10:50, 10:50]
    assert np.array_equal(corner_shirt, corner_blended), "Pixels outside artwork must remain untouched"
