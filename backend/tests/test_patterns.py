import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_list_patterns_default():
    response = client.get("/api/patterns")
    assert response.status_code == 200
    patterns = response.json()
    assert len(patterns) >= 15
    for p in patterns:
        assert p["is_active"] is True

def test_pattern_duplicate_and_delete():
    # Duplicate front_left_chest
    dup_res = client.post("/api/patterns/front_left_chest/duplicate")
    assert dup_res.status_code == 200
    new_pat = dup_res.json()
    assert new_pat["pattern_id"].startswith("front_left_chest_copy_")
    assert "Copy" in new_pat["name"]
    assert new_pat["is_custom"] is True

    # Delete the newly created custom pattern
    del_res = client.delete(f"/api/patterns/{new_pat['pattern_id']}")
    assert del_res.status_code == 200
    assert "deleted" in del_res.json()["message"]

def test_default_pattern_cannot_be_deleted():
    del_res = client.delete("/api/patterns/front_left_chest")
    assert del_res.status_code == 400
    assert "default" in del_res.json()["detail"].lower()

def test_pattern_toggle_and_inactive_filter():
    # Toggle small_logo_front_large_graphic_back to inactive
    pid = "small_logo_front_large_graphic_back"
    toggle_res = client.patch(f"/api/patterns/{pid}/toggle")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    # Listing without include_inactive should not include it
    active_res = client.get("/api/patterns")
    active_ids = [p["pattern_id"] for p in active_res.json()]
    assert pid not in active_ids

    # Listing with include_inactive should include it
    all_res = client.get("/api/patterns?include_inactive=true")
    all_ids = [p["pattern_id"] for p in all_res.json()]
    assert pid in all_ids

    # Re-enable it
    toggle_back = client.patch(f"/api/patterns/{pid}/toggle")
    assert toggle_back.status_code == 200
    assert toggle_back.json()["is_active"] is True

def test_pattern_update():
    pid = "front_only"
    res = client.put(f"/api/patterns/{pid}", json={
        "name": "Front Only - Standard",
        "description": "Standard single front placement"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Front Only - Standard"

def test_restore_defaults():
    # Restore defaults should succeed non-destructively
    res = client.post("/api/patterns/restore-defaults")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 15
