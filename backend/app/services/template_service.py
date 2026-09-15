import os
import shutil
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from PIL import Image
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.template import Template, PrintZone, TemplateAsset, TemplateCategory
from app.models.design_job import DesignJob

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
TEMPLATES_STORAGE_DIR = os.path.join(STORAGE_DIR, "templates")

os.makedirs(TEMPLATES_STORAGE_DIR, exist_ok=True)


class TemplateService:
    """
    Dedicated service for managing database-backed, generic apparel templates,
    per-template assets, and pixel-calibrated print zones.
    """

    @staticmethod
    def get_template_dir(template_id: int) -> str:
        t_dir = os.path.join(TEMPLATES_STORAGE_DIR, str(template_id))
        os.makedirs(t_dir, exist_ok=True)
        return t_dir

    @classmethod
    def list_templates(
        cls,
        db: Session,
        q: Optional[str] = None,
        category: Optional[str] = None,
        color: Optional[str] = None,
        style: Optional[str] = None,
        status: Optional[str] = None,
        include_inactive: bool = False,
        sort_by: str = "recently_created"
    ) -> List[Template]:
        query = db.query(Template)

        if not include_inactive:
            if status:
                query = query.filter(Template.status == status)
            else:
                query = query.filter(or_(Template.status == "active", Template.status == None, Template.is_active == True))
        elif status:
            query = query.filter(Template.status == status)

        if q:
            term = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    Template.name.ilike(term),
                    Template.category.ilike(term),
                    Template.description.ilike(term),
                    Template.color.ilike(term),
                    Template.style.ilike(term)
                )
            )

        if category and category.lower() != "all":
            query = query.filter(Template.category.ilike(category))

        if color and color.lower() != "all":
            query = query.filter(Template.color.ilike(color))

        if style and style.lower() != "all":
            query = query.filter(Template.style.ilike(style))

        # Sorting
        if sort_by == "recently_modified":
            query = query.order_by(Template.updated_at.desc().nullslast(), Template.created_at.desc())
        elif sort_by == "name":
            query = query.order_by(Template.name.asc())
        else: # "recently_created"
            query = query.order_by(Template.created_at.desc())

        return query.all()

    @classmethod
    def get_template(cls, template_id: int, db: Session) -> Optional[Template]:
        return db.query(Template).filter(Template.id == template_id).first()

    @classmethod
    def create_template(
        cls,
        name: str,
        category: str,
        color: str,
        style: str,
        description: Optional[str],
        status: str = "active",
        view_files: Optional[Dict[str, bytes]] = None,
        view_filenames: Optional[Dict[str, str]] = None,
        db: Session = None
    ) -> Template:
        """
        Creates a new generic apparel template with dedicated folder storage
        and registered assets for uploaded views.
        view_files: dict mapping view name (e.g. 'front', 'back', 'left_sleeve') to file bytes.
        """
        if not name or not name.strip():
            raise ValueError("Template name is required.")

        code_slug = f"{name.lower().replace(' ', '_').replace('-', '_')}_{uuid.uuid4().hex[:6]}"

        template = Template(
            name=name.strip(),
            code=code_slug,
            category=category or "Custom",
            color=color or "Black",
            style=style or "Standard",
            description=description,
            status=status or "active",
            is_active=(status != "inactive"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(template)
        db.commit()
        db.refresh(template)

        # Process uploaded view assets
        view_files = view_files or {}
        view_filenames = view_filenames or {}

        t_dir = cls.get_template_dir(template.id)

        first_w, first_h = 2700, 2643

        for view_name, f_bytes in view_files.items():
            if not f_bytes or len(f_bytes) == 0:
                continue

            orig_fname = view_filenames.get(view_name, f"{view_name}.png")
            ext = os.path.splitext(orig_fname)[1].lower() or ".png"
            safe_view = view_name.lower().replace(" ", "_")
            dest_filename = f"{safe_view}{ext}"
            dest_path = os.path.join(t_dir, dest_filename)

            with open(dest_path, "wb") as f:
                f.write(f_bytes)

            # Inspect dimensions
            try:
                with Image.open(dest_path) as img:
                    w, h = img.size
            except Exception:
                w, h = 2700, 2643

            if view_name == "front" or not template.canvas_width:
                first_w, first_h = w, h

            rel_path = f"/storage/templates/{template.id}/{dest_filename}"

            asset = TemplateAsset(
                template_id=template.id,
                view=safe_view,
                file_path=rel_path,
                width=w,
                height=h,
                created_at=datetime.utcnow()
            )
            db.add(asset)

            # Keep legacy preview fields populated if applicable
            if safe_view == "front":
                template.preview_front_black = rel_path
                template.preview_front_white = rel_path
            elif safe_view == "back":
                template.preview_back_black = rel_path
                template.preview_back_white = rel_path

        template.canvas_width = first_w
        template.canvas_height = first_h
        db.commit()
        db.refresh(template)

        return template

    @classmethod
    def add_asset_to_template(
        cls,
        template_id: int,
        view: str,
        file_bytes: bytes,
        original_filename: str,
        db: Session
    ) -> TemplateAsset:
        template = cls.get_template(template_id, db)
        if not template:
            raise ValueError(f"Template {template_id} not found.")

        t_dir = cls.get_template_dir(template_id)
        ext = os.path.splitext(original_filename)[1].lower() or ".png"
        safe_view = view.lower().replace(" ", "_")
        dest_filename = f"{safe_view}{ext}"
        dest_path = os.path.join(t_dir, dest_filename)

        with open(dest_path, "wb") as f:
            f.write(file_bytes)

        with Image.open(dest_path) as img:
            w, h = img.size

        rel_path = f"/storage/templates/{template_id}/{dest_filename}"

        # Update or create asset record
        existing = db.query(TemplateAsset).filter(
            TemplateAsset.template_id == template_id,
            TemplateAsset.view == safe_view
        ).first()

        if existing:
            existing.file_path = rel_path
            existing.width = w
            existing.height = h
            asset = existing
        else:
            asset = TemplateAsset(
                template_id=template_id,
                view=safe_view,
                file_path=rel_path,
                width=w,
                height=h
            )
            db.add(asset)

        template.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(asset)
        return asset

    @classmethod
    def validate_zone_coordinates(
        cls,
        template: Template,
        view: str,
        x: float,
        y: float,
        width: float,
        height: float,
        db: Session
    ):
        """
        Validates that print zone dimensions are positive and within image boundaries.
        """
        if width <= 0 or height <= 0:
            raise ValueError("Print zone width and height must be greater than zero.")

        if x < 0 or y < 0:
            raise ValueError("Print zone X and Y coordinates cannot be negative.")

        # Find corresponding asset to check resolution bounds
        asset = db.query(TemplateAsset).filter(
            TemplateAsset.template_id == template.id,
            TemplateAsset.view == view.lower()
        ).first()

        max_w = asset.width if asset else (template.canvas_width or 2700)
        max_h = asset.height if asset else (template.canvas_height or 2643)

        if (x + width) > max_w or (y + height) > max_h:
            raise ValueError(
                f"Print zone ({int(x)}, {int(y)}, {int(width)}x{int(height)}) must remain "
                f"completely inside the template image boundaries ({max_w}x{max_h} px)."
            )

    @classmethod
    def add_print_zone(
        cls,
        template_id: int,
        name: str,
        view: str,
        zone_code: str,
        x: float,
        y: float,
        width: float,
        height: float,
        rotation: float = 0.0,
        scale: float = 1.0,
        fit_mode: str = "contain",
        safe_margin: float = 20.0,
        db: Session = None
    ) -> PrintZone:
        template = cls.get_template(template_id, db)
        if not template:
            raise ValueError(f"Template {template_id} not found.")

        safe_view = (view or "front").lower()
        cls.validate_zone_coordinates(template, safe_view, x, y, width, height, db)

        code = zone_code.strip().upper().replace(" ", "_") if zone_code else f"ZONE_{uuid.uuid4().hex[:6].upper()}"

        zone = PrintZone(
            template_id=template_id,
            name=name.strip(),
            view=safe_view,
            side=safe_view if safe_view in ("front", "back") else "front",
            zone_code=code,
            x=round(float(x), 2),
            y=round(float(y), 2),
            width=round(float(width), 2),
            height=round(float(height), 2),
            rotation=float(rotation),
            scale=float(scale),
            fit_mode=fit_mode or "contain",
            safe_margin=float(safe_margin),
            is_active=True,
            updated_at=datetime.utcnow()
        )
        db.add(zone)
        template.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(zone)
        return zone

    @classmethod
    def update_print_zone(
        cls,
        template_id: int,
        zone_id: int,
        data: Dict[str, Any],
        db: Session
    ) -> PrintZone:
        zone = db.query(PrintZone).filter(PrintZone.id == zone_id, PrintZone.template_id == template_id).first()
        if not zone:
            raise ValueError(f"Print zone {zone_id} not found for template {template_id}.")

        template = cls.get_template(template_id, db)

        new_x = float(data.get("x", zone.x))
        new_y = float(data.get("y", zone.y))
        new_w = float(data.get("width", zone.width))
        new_h = float(data.get("height", zone.height))
        new_view = data.get("view", zone.view or zone.side or "front").lower()

        cls.validate_zone_coordinates(template, new_view, new_x, new_y, new_w, new_h, db)

        zone.x = round(new_x, 2)
        zone.y = round(new_y, 2)
        zone.width = round(new_w, 2)
        zone.height = round(new_h, 2)
        zone.view = new_view
        zone.side = new_view if new_view in ("front", "back") else "front"

        if "name" in data and data["name"]:
            zone.name = data["name"].strip()
        if "zone_code" in data and data["zone_code"]:
            zone.zone_code = data["zone_code"].strip().upper().replace(" ", "_")
        if "rotation" in data:
            zone.rotation = float(data["rotation"])
        if "scale" in data:
            zone.scale = float(data["scale"])
        if "fit_mode" in data:
            zone.fit_mode = data["fit_mode"]
        if "safe_margin" in data:
            zone.safe_margin = float(data["safe_margin"])
        if "is_active" in data:
            zone.is_active = bool(data["is_active"])

        zone.updated_at = datetime.utcnow()
        template.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(zone)
        return zone

    @classmethod
    def delete_print_zone(cls, template_id: int, zone_id: int, db: Session) -> bool:
        zone = db.query(PrintZone).filter(PrintZone.id == zone_id, PrintZone.template_id == template_id).first()
        if not zone:
            return False
        db.delete(zone)
        db.commit()
        return True

    @classmethod
    def duplicate_template(cls, template_id: int, new_name: Optional[str], db: Session) -> Template:
        """
        Creates an independent duplicate of the template, copying its metadata,
        asset files into a new template storage directory, and replicating all print zones.
        """
        src = cls.get_template(template_id, db)
        if not src:
            raise ValueError(f"Source template {template_id} not found.")

        target_name = (new_name or f"{src.name} (Copy)").strip()
        target_code = f"{src.code or 'template'}_copy_{uuid.uuid4().hex[:6]}"

        clone = Template(
            name=target_name,
            code=target_code,
            category=src.category,
            color=src.color,
            style=src.style,
            description=src.description,
            status="active",
            is_active=True,
            canvas_width=src.canvas_width,
            canvas_height=src.canvas_height,
            preview_front_black=src.preview_front_black,
            preview_front_white=src.preview_front_white,
            preview_back_black=src.preview_back_black,
            preview_back_white=src.preview_back_white,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(clone)
        db.commit()
        db.refresh(clone)

        # Copy assets
        clone_dir = cls.get_template_dir(clone.id)
        for asset in src.assets:
            src_file = None
            if asset.file_path.startswith("/storage/templates/"):
                rel = asset.file_path.replace("/storage/templates/", "")
                src_file = os.path.join(TEMPLATES_STORAGE_DIR, rel)
            elif asset.file_path.startswith("/mockups/") or asset.file_path.startswith("mockups/"):
                rel = asset.file_path.replace("/mockups/", "").replace("mockups/", "")
                src_file = os.path.join(BASE_DIR, "templates", "mockups", rel)

            if src_file and os.path.exists(src_file):
                ext = os.path.splitext(src_file)[1]
                dest_file = os.path.join(clone_dir, f"{asset.view}{ext}")
                shutil.copy2(src_file, dest_file)
                new_rel_path = f"/storage/templates/{clone.id}/{asset.view}{ext}"
            else:
                new_rel_path = asset.file_path

            new_asset = TemplateAsset(
                template_id=clone.id,
                view=asset.view,
                file_path=new_rel_path,
                width=asset.width,
                height=asset.height
            )
            db.add(new_asset)

        # Duplicate print zones
        for z in src.zones:
            new_zone = PrintZone(
                template_id=clone.id,
                name=z.name,
                view=z.view or z.side,
                side=z.side,
                zone_code=z.zone_code,
                x=z.x,
                y=z.y,
                width=z.width,
                height=z.height,
                rotation=z.rotation,
                scale=z.scale,
                fit_mode=z.fit_mode,
                safe_margin=z.safe_margin,
                is_active=z.is_active
            )
            db.add(new_zone)

        db.commit()
        db.refresh(clone)
        return clone

    @classmethod
    def deactivate_template(cls, template_id: int, db: Session) -> Template:
        template = cls.get_template(template_id, db)
        if not template:
            raise ValueError(f"Template {template_id} not found.")

        template.status = "inactive"
        template.is_active = False
        template.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(template)
        return template

    @classmethod
    def activate_template(cls, template_id: int, db: Session) -> Template:
        template = cls.get_template(template_id, db)
        if not template:
            raise ValueError(f"Template {template_id} not found.")

        template.status = "active"
        template.is_active = True
        template.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(template)
        return template

    @classmethod
    def list_categories(cls, db: Session) -> List[TemplateCategory]:
        return db.query(TemplateCategory).filter(TemplateCategory.is_active == True).order_by(TemplateCategory.name.asc()).all()

    @classmethod
    def add_category(cls, name: str, description: Optional[str], db: Session) -> TemplateCategory:
        code = name.strip().lower().replace(" ", "_")
        existing = db.query(TemplateCategory).filter(TemplateCategory.code == code).first()
        if existing:
            return existing

        cat = TemplateCategory(name=name.strip(), code=code, description=description, is_active=True)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        return cat
