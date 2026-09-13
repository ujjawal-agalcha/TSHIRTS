import os
from fastapi.testclient import TestClient
from app.main import app
from app.database.connection import SessionLocal
from app.models.pattern import Pattern
from app.models.design_job import DesignJob
from psd_tools import PSDImage

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_templates_and_zones():
    response = client.get("/api/templates")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    t = data[0]
    assert t["canvas_width"] == 2700
    assert t["canvas_height"] == 2643
    assert len(t["zones"]) >= 7

    # Test updating a zone coordinate
    zone_id = t["zones"][0]["id"]
    update_res = client.put(f"/api/templates/{t['id']}/zones/{zone_id}", json={
        "safe_margin": 25.0
    })
    assert update_res.status_code == 200
    assert update_res.json()["safe_margin"] == 25.0

def test_patterns_loaded():
    response = client.get("/api/patterns")
    assert response.status_code == 200
    patterns = response.json()
    assert len(patterns) >= 15
    
    # Check that small_front_full_back requires both front and back
    dual_pattern = next(p for p in patterns if p["pattern_id"] == "small_front_full_back")
    assert "front" in dual_pattern["required_uploads"]
    assert "back" in dual_pattern["required_uploads"]

def test_full_png_generation_workflow():
    # 1. Use the extracted sample artwork
    sample_art_path = r"c:\TSHIRTS\templates\extracted\4_NARUTO_1.png"
    assert os.path.exists(sample_art_path), "Sample artwork must exist"

    # 2. Upload front artwork
    with open(sample_art_path, "rb") as f:
        res_front = client.post("/api/design/upload", files={"file": ("front_test.png", f, "image/png")})
    assert res_front.status_code == 200
    front_id = res_front.json()["artwork_id"]
    assert res_front.json()["inspection"]["has_transparency"] is True

    # 3. Upload back artwork
    with open(sample_art_path, "rb") as f:
        res_back = client.post("/api/design/upload", files={"file": ("back_test.png", f, "image/png")})
    assert res_back.status_code == 200
    back_id = res_back.json()["artwork_id"]

    # 4. Generate instant 2x2 preview
    preview_res = client.post("/api/design/preview-2x2", json={
        "pattern_id": "small_front_full_back",
        "front_artwork_id": front_id,
        "back_artwork_id": back_id,
        "transforms": {
            "front": {"scale_multiplier": 1.0, "offset_x": 0.0, "offset_y": 0.0, "rotation": 0.0},
            "back": {"scale_multiplier": 1.0, "offset_x": 0.0, "offset_y": 0.0, "rotation": 0.0}
        }
    })
    assert preview_res.status_code == 200
    assert "preview_url" in preview_res.json()

    # 5. Generate Print-Ready 2x2 PNG
    gen_res = client.post("/api/design/generate", json={
        "color": "Black",
        "style": "Oversized",
        "pattern_id": "small_front_full_back",
        "front_artwork_id": front_id,
        "back_artwork_id": back_id,
        "transforms": {
            "front": {"scale_multiplier": 1.0, "offset_x": 0.0, "offset_y": 0.0, "rotation": 0.0},
            "back": {"scale_multiplier": 1.0, "offset_x": 0.0, "offset_y": 0.0, "rotation": 0.0}
        },
        "include_labels": False
    })
    assert gen_res.status_code == 200
    job_data = gen_res.json()
    assert job_data["status"] == "completed"
    assert job_data["job_code"].startswith("DESIGNJOB_")
    assert job_data["width"] == 5400
    assert job_data["height"] == 5286
    assert job_data["format"] == "PNG"
    assert job_data["color_mode"] == "RGBA"
    assert job_data["output_png_path"] is not None
    assert os.path.exists(job_data["output_png_path"])

    # 6. Verify with PIL that generated PNG is exactly 5400x5286 RGBA
    from PIL import Image
    with Image.open(job_data["output_png_path"]) as out_img:
        assert out_img.size == (5400, 5286)
        assert out_img.mode == "RGBA"
        assert out_img.format == "PNG"

    # 7. Test download endpoint
    dl_res = client.get(f"/api/design/download/{job_data['id']}")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "image/png"
    assert len(dl_res.content) > 1000000  # High-res file is > 1MB

def test_inventory_flow():
    res = client.get("/api/inventory")
    assert res.status_code == 200
    items = res.json()
    assert len(items) > 0

    item = items[0]
    orig_stock = item["stock_quantity"]
    
    # Adjust stock +5
    adj_res = client.patch(f"/api/inventory/{item['id']}/stock", json={"delta": 5})
    assert adj_res.status_code == 200
    assert adj_res.json()["stock_quantity"] == orig_stock + 5

def test_ai_assistant_deterministic_flow():
    # Test specific stock question
    chat_res = client.post("/api/ai/chat", json={
        "message": "How many black oversized L T-shirts do I have?"
    })
    assert chat_res.status_code == 200
    reply = chat_res.json()["reply"]
    assert "OS-BLK-L" in reply

    # Test dual print patterns question
    chat_res2 = client.post("/api/ai/chat", json={
        "message": "Which patterns support front and back printing?"
    })
    assert chat_res2.status_code == 200
    reply2 = chat_res2.json()["reply"]
    assert ("Left Chest + Back Full" in reply2 or "Small Front + Full Back" in reply2)
