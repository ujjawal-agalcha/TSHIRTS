import json
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal, Base, engine
from app.models.garment import TshirtProduct, TshirtColor, TshirtStyle, TshirtSize
from app.models.template import Template, PrintZone
from app.models.pattern import Pattern
from app.models.inventory import Inventory, Supplier
from app.models.design_job import DesignJob

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    
    try:
        # 1. Colors
        if db.query(TshirtColor).count() == 0:
            colors = [
                TshirtColor(name="White", code="white", hex_value="#FFFFFF"),
                TshirtColor(name="Black", code="black", hex_value="#121212")
            ]
            db.add_all(colors)
            db.commit()

        # 2. Styles
        if db.query(TshirtStyle).count() == 0:
            styles = [
                TshirtStyle(name="Oversized", code="oversized", description="Modern dropped-shoulder relaxed streetwear silhouette"),
                TshirtStyle(name="Regular", code="regular", description="Classic tailored crewneck fit")
            ]
            db.add_all(styles)
            db.commit()

        # 3. Sizes
        if db.query(TshirtSize).count() == 0:
            sizes = [
                TshirtSize(name="XS", sort_order=1),
                TshirtSize(name="S", sort_order=2),
                TshirtSize(name="M", sort_order=3),
                TshirtSize(name="L", sort_order=4),
                TshirtSize(name="XL", sort_order=5),
                TshirtSize(name="XXL", sort_order=6),
            ]
            db.add_all(sizes)
            db.commit()

        # 4. Master Template
        template = db.query(Template).filter(Template.code == "oversized_master").first()
        if not template:
            template = Template(
                name="Oversized Streetwear Master Template",
                code="oversized_master",
                canvas_width=2700,
                canvas_height=2643,
                preview_front_black="/mockups/black_front.png",
                preview_front_white="/mockups/white_front.png",
                preview_back_black="/mockups/black_back.png",
                preview_back_white="/mockups/white_back.png",
                master_psd_path="templates/master/master_oversized_template.psd"
            )
            db.add(template)
            db.commit()
            db.refresh(template)

        # 5. Print Zones for Template
        if db.query(PrintZone).filter(PrintZone.template_id == template.id).count() == 0:
            zones = [
                # Front Zones
                PrintZone(
                    template_id=template.id,
                    side="front",
                    zone_code="LEFT_CHEST",
                    name="Front Left Chest",
                    x=680.0,
                    y=750.0,
                    width=440.0,
                    height=440.0,
                    rotation=0.0,
                    scale=1.0,
                    fit_mode="contain",
                    safe_margin=15.0
                ),
                PrintZone(
                    template_id=template.id,
                    side="front",
                    zone_code="CENTER_CHEST",
                    name="Front Center Chest",
                    x=950.0,
                    y=850.0,
                    width=800.0,
                    height=650.0,
                    rotation=0.0,
                    scale=1.0,
                    fit_mode="contain",
                    safe_margin=20.0
                ),
                PrintZone(
                    template_id=template.id,
                    side="front",
                    zone_code="UPPER_CENTER",
                    name="Front Upper Center",
                    x=900.0,
                    y=620.0,
                    width=900.0,
                    height=450.0,
                    rotation=0.0,
                    scale=1.0,
                    fit_mode="contain",
                    safe_margin=15.0
                ),
                PrintZone(
                    template_id=template.id,
                    side="front",
                    zone_code="FULL_FRONT",
                    name="Full Front Graphic",
                    x=864.0,  # Exact PSD template calibration
                    y=640.0,
                    width=970.0,
                    height=1451.0,
                    rotation=0.0,
                    scale=1.0,
                    fit_mode="contain",
                    safe_margin=20.0
                ),
                PrintZone(
                    template_id=template.id,
                    side="front",
                    zone_code="FRONT_CUSTOM",
                    name="Front Custom Zone",
                    x=800.0,
                    y=600.0,
                    width=1100.0,
                    height=1500.0,
                    rotation=0.0,
                    scale=1.0,
                    fit_mode="contain",
                    safe_margin=20.0
                ),
                # Back Zones
                PrintZone(
                    template_id=template.id,
                    side="back",
                    zone_code="BACK_CENTER",
                    name="Back Center Graphic",
                    x=850.0,
                    y=650.0,
                    width=1000.0,
                    height=1300.0,
                    rotation=0.0,
                    scale=1.0,
                    fit_mode="contain",
                    safe_margin=20.0
                ),
                PrintZone(
                    template_id=template.id,
                    side="back",
                    zone_code="FULL_BACK",
                    name="Full Back Graphic",
                    x=750.0,
                    y=550.0,
                    width=1200.0,
                    height=1650.0,
                    rotation=0.0,
                    scale=1.0,
                    fit_mode="contain",
                    safe_margin=20.0
                ),
                PrintZone(
                    template_id=template.id,
                    side="back",
                    zone_code="BACK_NECK_LOGO",
                    name="Back Neck Logo",
                    x=1150.0,
                    y=380.0,
                    width=400.0,
                    height=250.0,
                    rotation=0.0,
                    scale=1.0,
                    fit_mode="contain",
                    safe_margin=10.0
                ),
                PrintZone(
                    template_id=template.id,
                    side="back",
                    zone_code="BACK_CUSTOM",
                    name="Back Custom Zone",
                    x=700.0,
                    y=500.0,
                    width=1300.0,
                    height=1700.0,
                    rotation=0.0,
                    scale=1.0,
                    fit_mode="contain",
                    safe_margin=20.0
                )
            ]
            db.add_all(zones)
            db.commit()

        # 6. Patterns (15 Patterns)
        if db.query(Pattern).count() == 0:
            patterns = [
                Pattern(
                    pattern_id="front_left_chest",
                    name="Front Left Chest",
                    description="Subtle pocket/heart logo on front left, blank back",
                    category="Front-Only",
                    preview_badge="Front Only",
                    front_slots=json.dumps([{"slot": "front", "zone_code": "LEFT_CHEST", "label": "Left Chest Logo", "required": True}]),
                    back_slots=json.dumps([]),
                    required_uploads=json.dumps(["front"]),
                    sort_order=1
                ),
                Pattern(
                    pattern_id="front_center_small",
                    name="Front Center Small",
                    description="Minimal centered graphic or upper typography on front chest",
                    category="Front-Only",
                    preview_badge="Front Only",
                    front_slots=json.dumps([{"slot": "front", "zone_code": "UPPER_CENTER", "label": "Upper Center Graphic", "required": True}]),
                    back_slots=json.dumps([]),
                    required_uploads=json.dumps(["front"]),
                    sort_order=2
                ),
                Pattern(
                    pattern_id="front_center_large",
                    name="Front Center Large",
                    description="Standard prominent center chest artwork",
                    category="Front-Only",
                    preview_badge="Front Only",
                    front_slots=json.dumps([{"slot": "front", "zone_code": "CENTER_CHEST", "label": "Center Chest Artwork", "required": True}]),
                    back_slots=json.dumps([]),
                    required_uploads=json.dumps(["front"]),
                    sort_order=3
                ),
                Pattern(
                    pattern_id="front_full",
                    name="Front Full",
                    description="Full oversized front graphic spanning chest to lower torso",
                    category="Front-Only",
                    preview_badge="Front Only",
                    front_slots=json.dumps([{"slot": "front", "zone_code": "FULL_FRONT", "label": "Full Front Artwork", "required": True}]),
                    back_slots=json.dumps([]),
                    required_uploads=json.dumps(["front"]),
                    sort_order=4
                ),
                Pattern(
                    pattern_id="back_center",
                    name="Back Center",
                    description="Centered graphic on the back with blank front",
                    category="Back-Only",
                    preview_badge="Back Only",
                    front_slots=json.dumps([]),
                    back_slots=json.dumps([{"slot": "back", "zone_code": "BACK_CENTER", "label": "Back Center Artwork", "required": True}]),
                    required_uploads=json.dumps(["back"]),
                    sort_order=5
                ),
                Pattern(
                    pattern_id="back_full",
                    name="Back Full",
                    description="Large oversized statement artwork covering majority of the back",
                    category="Back-Only",
                    preview_badge="Back Only",
                    front_slots=json.dumps([]),
                    back_slots=json.dumps([{"slot": "back", "zone_code": "FULL_BACK", "label": "Full Back Artwork", "required": True}]),
                    required_uploads=json.dumps(["back"]),
                    sort_order=6
                ),
                Pattern(
                    pattern_id="small_front_full_back",
                    name="Small Front + Full Back",
                    description="Classic streetwear combination: minimal heart logo front + bold full back",
                    category="Dual-Print",
                    preview_badge="Front + Back",
                    front_slots=json.dumps([{"slot": "front", "zone_code": "LEFT_CHEST", "label": "Left Chest Logo", "required": True}]),
                    back_slots=json.dumps([{"slot": "back", "zone_code": "FULL_BACK", "label": "Full Back Artwork", "required": True}]),
                    required_uploads=json.dumps(["front", "back"]),
                    sort_order=7
                ),
                Pattern(
                    pattern_id="front_center_back_full",
                    name="Front Center + Back Full",
                    description="Medium front center graphic paired with an oversized full back print",
                    category="Dual-Print",
                    preview_badge="Front + Back",
                    front_slots=json.dumps([{"slot": "front", "zone_code": "CENTER_CHEST", "label": "Front Center Graphic", "required": True}]),
                    back_slots=json.dumps([{"slot": "back", "zone_code": "FULL_BACK", "label": "Full Back Artwork", "required": True}]),
                    required_uploads=json.dumps(["front", "back"]),
                    sort_order=8
                ),
                Pattern(
                    pattern_id="front_full_back_full",
                    name="Front Full + Back Full",
                    description="Heavy double-sided oversized graphics front and back",
                    category="Dual-Print",
                    preview_badge="Front + Back",
                    front_slots=json.dumps([{"slot": "front", "zone_code": "FULL_FRONT", "label": "Full Front Artwork", "required": True}]),
                    back_slots=json.dumps([{"slot": "back", "zone_code": "FULL_BACK", "label": "Full Back Artwork", "required": True}]),
                    required_uploads=json.dumps(["front", "back"]),
                    sort_order=9
                ),
                Pattern(
                    pattern_id="front_small_back_center",
                    name="Front Small + Back Center",
                    description="Upper front typography with balanced center back graphic",
                    category="Dual-Print",
                    preview_badge="Front + Back",
                    front_slots=json.dumps([{"slot": "front", "zone_code": "UPPER_CENTER", "label": "Front Upper Graphic", "required": True}]),
                    back_slots=json.dumps([{"slot": "back", "zone_code": "BACK_CENTER", "label": "Back Center Graphic", "required": True}]),
                    required_uploads=json.dumps(["front", "back"]),
                    sort_order=10
                ),
                Pattern(
                    pattern_id="front_typography_back_graphic",
                    name="Front Typography + Back Graphic",
                    description="Editorial upper chest typography combined with large artistic back illustration",
                    category="Dual-Print",
                    preview_badge="Front + Back",
                    front_slots=json.dumps([{"slot": "front", "zone_code": "UPPER_CENTER", "label": "Front Typography", "required": True}]),
                    back_slots=json.dumps([{"slot": "back", "zone_code": "FULL_BACK", "label": "Back Illustration", "required": True}]),
                    required_uploads=json.dumps(["front", "back"]),
                    sort_order=11
                ),
                Pattern(
                    pattern_id="back_only",
                    name="Back Only",
                    description="Pure back canvas design, perfectly clean front",
                    category="Back-Only",
                    preview_badge="Back Only",
                    front_slots=json.dumps([]),
                    back_slots=json.dumps([{"slot": "back", "zone_code": "FULL_BACK", "label": "Full Back Graphic", "required": True}]),
                    required_uploads=json.dumps(["back"]),
                    sort_order=12
                ),
                Pattern(
                    pattern_id="front_only",
                    name="Front Only",
                    description="High impact front art piece with unprinted back",
                    category="Front-Only",
                    preview_badge="Front Only",
                    front_slots=json.dumps([{"slot": "front", "zone_code": "FULL_FRONT", "label": "Front Artwork", "required": True}]),
                    back_slots=json.dumps([]),
                    required_uploads=json.dumps(["front"]),
                    sort_order=13
                ),
                Pattern(
                    pattern_id="small_logo_front_large_graphic_back",
                    name="Small Logo Front + Large Graphic Back",
                    description="Left heart embroidered-style logo with massive poster-style back print",
                    category="Dual-Print",
                    preview_badge="Front + Back",
                    front_slots=json.dumps([{"slot": "front", "zone_code": "LEFT_CHEST", "label": "Front Logo", "required": True}]),
                    back_slots=json.dumps([{"slot": "back", "zone_code": "FULL_BACK", "label": "Back Poster Artwork", "required": True}]),
                    required_uploads=json.dumps(["front", "back"]),
                    sort_order=14
                ),
                Pattern(
                    pattern_id="custom_front_custom_back",
                    name="Custom Front + Custom Back",
                    description="Fully custom configurable placement on both front and back",
                    category="Custom",
                    preview_badge="Custom",
                    front_slots=json.dumps([{"slot": "front", "zone_code": "FRONT_CUSTOM", "label": "Custom Front Artwork", "required": True}]),
                    back_slots=json.dumps([{"slot": "back", "zone_code": "BACK_CUSTOM", "label": "Custom Back Artwork", "required": True}]),
                    required_uploads=json.dumps(["front", "back"]),
                    sort_order=15
                )
            ]
            db.add_all(patterns)
            db.commit()

        # 7. Suppliers & Inventory
        if db.query(Supplier).count() == 0:
            s1 = Supplier(name="Apex Textiles Ltd.", contact_name="Vikram Mehta", email="sales@apextextiles.com", phone="+91-9876543210", lead_time_days=5)
            s2 = Supplier(name="Urban Blanks Co.", contact_name="Priya Sharma", email="orders@urbanblanks.com", phone="+91-9811223344", lead_time_days=7)
            db.add_all([s1, s2])
            db.commit()
            db.refresh(s1)
            db.refresh(s2)

            inventory_items = [
                Inventory(sku="OS-BLK-S", product_name="Oversized Streetwear Tee", color="Black", style="Oversized", size="S", stock_quantity=18, reorder_level=15, cost_price=7.50, selling_price=24.99, supplier_id=s1.id),
                Inventory(sku="OS-BLK-M", product_name="Oversized Streetwear Tee", color="Black", style="Oversized", size="M", stock_quantity=32, reorder_level=15, cost_price=7.50, selling_price=24.99, supplier_id=s1.id),
                Inventory(sku="OS-BLK-L", product_name="Oversized Streetwear Tee", color="Black", style="Oversized", size="L", stock_quantity=24, reorder_level=15, cost_price=7.50, selling_price=24.99, supplier_id=s1.id),
                Inventory(sku="OS-BLK-XL", product_name="Oversized Streetwear Tee", color="Black", style="Oversized", size="XL", stock_quantity=12, reorder_level=15, cost_price=7.50, selling_price=24.99, supplier_id=s1.id),
                Inventory(sku="OS-BLK-XXL", product_name="Oversized Streetwear Tee", color="Black", style="Oversized", size="XXL", stock_quantity=7, reorder_level=10, cost_price=8.00, selling_price=26.99, supplier_id=s1.id),
                
                Inventory(sku="OS-WHT-S", product_name="Oversized Streetwear Tee", color="White", style="Oversized", size="S", stock_quantity=20, reorder_level=15, cost_price=7.20, selling_price=24.99, supplier_id=s2.id),
                Inventory(sku="OS-WHT-M", product_name="Oversized Streetwear Tee", color="White", style="Oversized", size="M", stock_quantity=37, reorder_level=15, cost_price=7.20, selling_price=24.99, supplier_id=s2.id),
                Inventory(sku="OS-WHT-L", product_name="Oversized Streetwear Tee", color="White", style="Oversized", size="L", stock_quantity=29, reorder_level=15, cost_price=7.20, selling_price=24.99, supplier_id=s2.id),
                Inventory(sku="OS-WHT-XL", product_name="Oversized Streetwear Tee", color="White", style="Oversized", size="XL", stock_quantity=14, reorder_level=15, cost_price=7.20, selling_price=24.99, supplier_id=s2.id),

                Inventory(sku="REG-BLK-M", product_name="Classic Crewneck Tee", color="Black", style="Regular", size="M", stock_quantity=45, reorder_level=20, cost_price=5.50, selling_price=19.99, supplier_id=s1.id),
                Inventory(sku="REG-BLK-L", product_name="Classic Crewneck Tee", color="Black", style="Regular", size="L", stock_quantity=40, reorder_level=20, cost_price=5.50, selling_price=19.99, supplier_id=s1.id),
                Inventory(sku="REG-WHT-M", product_name="Classic Crewneck Tee", color="White", style="Regular", size="M", stock_quantity=50, reorder_level=20, cost_price=5.20, selling_price=19.99, supplier_id=s2.id),
                Inventory(sku="REG-WHT-L", product_name="Classic Crewneck Tee", color="White", style="Regular", size="L", stock_quantity=8, reorder_level=20, cost_price=5.20, selling_price=19.99, supplier_id=s2.id),
            ]
            db.add_all(inventory_items)
            db.commit()

        print("Database seeded successfully with templates, print zones, 15 patterns, inventory, and suppliers.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
