import os
import uuid
import json
from datetime import datetime
from PIL import Image
from sqlalchemy.orm import Session

from app.models.pattern import Pattern
from app.models.template import Template, PrintZone
from app.models.design_job import DesignJob, Artwork
from app.models.analytics import AnalyticsEvent
from app.processors.image_processor import ImageProcessor
from app.processors.psd_processor import PytoshopPSDProcessor
from app.processors.pattern_engine import PatternEngine

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
GENERATED_DIR = os.path.join(BASE_DIR, "generated")
MOCKUPS_DIR = os.path.join(BASE_DIR, "templates", "mockups")
MOCKUPS_WEB_DIR = os.path.join(MOCKUPS_DIR, "web")

class DesignService:
    @staticmethod
    def get_mockup_path(color: str, side: str, web_preview: bool = False) -> str:
        color_lower = (color or "black").lower()
        side_lower = (side or "front").lower()
        filename = f"{color_lower}_{side_lower}.png"
        
        target_dir = MOCKUPS_WEB_DIR if web_preview else MOCKUPS_DIR
        path = os.path.join(target_dir, filename)
        if not os.path.exists(path):
            # fallback to full mockup
            path = os.path.join(MOCKUPS_DIR, filename)
        return path

    @staticmethod
    def save_uploaded_artwork(file_bytes: bytes, original_filename: str, db: Session) -> Dict[str, Any]:
        ext = os.path.splitext(original_filename)[1].lower() or ".png"
        saved_filename = f"{uuid.uuid4().hex}{ext}"
        saved_path = os.path.join(UPLOADS_DIR, saved_filename)
        
        with open(saved_path, "wb") as f:
            f.write(file_bytes)
            
        inspection = ImageProcessor.inspect_artwork(saved_path)
        
        art_record = Artwork(
            filename=saved_filename,
            original_name=original_filename,
            file_path=saved_path,
            width=inspection["width"],
            height=inspection["height"],
            file_format=inspection["format"],
            has_transparency=inspection["has_transparency"]
        )
        db.add(art_record)
        db.commit()
        db.refresh(art_record)
        
        return {
            "artwork_id": saved_filename,
            "original_name": original_filename,
            "url": f"/uploads/{saved_filename}",
            "inspection": inspection
        }

    @staticmethod
    def generate_composite_preview(
        color: str,
        side: str,
        pattern_id: str,
        artwork_filename: Optional[str],
        transform: Optional[Dict[str, Any]],
        db: Session
    ) -> str:
        """
        Creates an on-the-fly preview image of the T-shirt with artwork placed at zone coordinates.
        Returns the relative URL path to the generated preview image.
        """
        mockup_path = DesignService.get_mockup_path(color, side, web_preview=False)
        base_img = Image.open(mockup_path).convert("RGBA")
        canvas_w, canvas_h = base_img.size # 2700 x 2643
        
        if artwork_filename:
            art_path = os.path.join(UPLOADS_DIR, artwork_filename)
            if os.path.exists(art_path):
                pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
                slots = (pattern.get_front_slots() if side == "front" else pattern.get_back_slots()) if pattern else []
                zone_code = slots[0].get("zone_code") if slots else ("FULL_FRONT" if side == "front" else "FULL_BACK")
                
                # Fetch zone
                zone = db.query(PrintZone).filter(PrintZone.zone_code == zone_code).first()
                zone_x = zone.x if zone else 864
                zone_y = zone.y if zone else 640
                zone_w = zone.width if zone else 970
                zone_h = zone.height if zone else 1451
                safe_margin = zone.safe_margin if zone else 20.0
                fit_mode = zone.fit_mode if zone else "contain"
                
                # Apply user manual adjustments if any
                scale_mult = float(transform.get("scale_multiplier", 1.0)) if transform else 1.0
                offset_x = float(transform.get("offset_x", 0.0)) if transform else 0.0
                offset_y = float(transform.get("offset_y", 0.0)) if transform else 0.0
                rot_deg = float(transform.get("rotation", 0.0)) if transform else 0.0
                
                transformed_art, _, _, rel_x, rel_y = ImageProcessor.transform_artwork(
                    artwork_path=art_path,
                    target_width=zone_w,
                    target_height=zone_h,
                    fit_mode=fit_mode,
                    safe_margin=safe_margin,
                    scale_multiplier=scale_mult,
                    rotation_degrees=rot_deg,
                    offset_x=offset_x,
                    offset_y=offset_y
                )
                
                place_x = int(round(zone_x + rel_x))
                place_y = int(round(zone_y + rel_y))
                base_img.paste(transformed_art, (place_x, place_y), transformed_art)

        # Downscale for web preview
        preview_filename = f"preview_{uuid.uuid4().hex[:10]}.png"
        preview_path = os.path.join(GENERATED_DIR, preview_filename)
        
        # Resize to max 1000px for speedy preview
        w, h = base_img.size
        ratio = 1000.0 / max(w, h)
        preview_img = base_img.resize((int(w * ratio), int(h * ratio)), Image.Resampling.LANCZOS)
        preview_img.save(preview_path, "PNG", optimize=True)
        
        return f"/generated/{preview_filename}"

    @staticmethod
    def generate_print_ready_psd(
        color: str,
        style: str,
        pattern_id: str,
        front_artwork_id: Optional[str],
        back_artwork_id: Optional[str],
        transforms: Dict[str, Any],
        db: Session
    ) -> DesignJob:
        """
        Executes full PSD generation using Pytoshop with authentic layers,
        preserves master coordinates, and creates DesignJob record.
        """
        pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
        if not pattern:
            raise ValueError(f"Pattern {pattern_id} not found.")

        reqs = PatternEngine.get_pattern_requirements(pattern)
        if reqs["requires_front"] and not front_artwork_id:
            raise ValueError("Front artwork is required for this pattern.")
        if reqs["requires_back"] and not back_artwork_id:
            raise ValueError("Back artwork is required for this pattern.")

        # Timestamp for filename: DESIGNJOB_YYYYMMDD_HHMMSS_PATTERN.psd
        now = datetime.utcnow()
        timestamp_str = now.strftime("%Y%m%d_%H%M%S")
        safe_pattern_code = pattern_id.upper().replace("-", "_")
        job_code = f"DESIGNJOB_{timestamp_str}_{safe_pattern_code}"
        psd_filename = f"{job_code}.psd"
        psd_output_path = os.path.join(GENERATED_DIR, psd_filename)
        preview_png_filename = f"{job_code}_preview.png"
        preview_png_path = os.path.join(GENERATED_DIR, preview_png_filename)

        # Initialize PSD Processor
        processor = PytoshopPSDProcessor(width=2700, height=2643)

        # 1. Add T-shirt Mockup background layer
        # If pattern has front, start with front mockup. If back only, use back mockup.
        is_back_only = reqs["requires_back"] and not reqs["requires_front"]
        primary_side = "back" if is_back_only else "front"
        base_mockup_path = DesignService.get_mockup_path(color, primary_side, web_preview=False)
        processor.load_template(base_mockup_path)

        # 2. Add Front Artwork if required
        if reqs["requires_front"] and front_artwork_id:
            front_path = os.path.join(UPLOADS_DIR, front_artwork_id)
            if not os.path.exists(front_path):
                raise FileNotFoundError(f"Front artwork file {front_artwork_id} not found.")
            
            slots = pattern.get_front_slots()
            zone_code = slots[0].get("zone_code") if slots else "FULL_FRONT"
            zone = db.query(PrintZone).filter(PrintZone.zone_code == zone_code).first()
            
            zone_x = zone.x if zone else 864
            zone_y = zone.y if zone else 640
            zone_w = zone.width if zone else 970
            zone_h = zone.height if zone else 1451
            safe_margin = zone.safe_margin if zone else 20.0
            fit_mode = zone.fit_mode if zone else "contain"
            
            t = transforms.get("front", {})
            transformed_front, _, _, rel_x, rel_y = ImageProcessor.transform_artwork(
                artwork_path=front_path,
                target_width=zone_w,
                target_height=zone_h,
                fit_mode=t.get("fit_mode", fit_mode),
                safe_margin=safe_margin,
                scale_multiplier=float(t.get("scale_multiplier", 1.0)),
                rotation_degrees=float(t.get("rotation", 0.0)),
                offset_x=float(t.get("offset_x", 0.0)),
                offset_y=float(t.get("offset_y", 0.0))
            )
            
            processor.add_artwork_layer(
                image=transformed_front,
                name="Front Artwork Layer",
                top=int(round(zone_y + rel_y)),
                left=int(round(zone_x + rel_x)),
                opacity=255,
                visible=True
            )

        # 3. Add Back Artwork if required
        if reqs["requires_back"] and back_artwork_id:
            back_path = os.path.join(UPLOADS_DIR, back_artwork_id)
            if not os.path.exists(back_path):
                raise FileNotFoundError(f"Back artwork file {back_artwork_id} not found.")
            
            slots = pattern.get_back_slots()
            zone_code = slots[0].get("zone_code") if slots else "FULL_BACK"
            zone = db.query(PrintZone).filter(PrintZone.zone_code == zone_code).first()
            
            zone_x = zone.x if zone else 750
            zone_y = zone.y if zone else 550
            zone_w = zone.width if zone else 1200
            zone_h = zone.height if zone else 1650
            safe_margin = zone.safe_margin if zone else 20.0
            fit_mode = zone.fit_mode if zone else "contain"
            
            t = transforms.get("back", {})
            transformed_back, _, _, rel_x, rel_y = ImageProcessor.transform_artwork(
                artwork_path=back_path,
                target_width=zone_w,
                target_height=zone_h,
                fit_mode=t.get("fit_mode", fit_mode),
                safe_margin=safe_margin,
                scale_multiplier=float(t.get("scale_multiplier", 1.0)),
                rotation_degrees=float(t.get("rotation", 0.0)),
                offset_x=float(t.get("offset_x", 0.0)),
                offset_y=float(t.get("offset_y", 0.0))
            )
            
            # If dual print, add back mockup layer underneath or back artwork on top
            if reqs["requires_front"]:
                back_mockup_path = DesignService.get_mockup_path(color, "back", web_preview=False)
                if os.path.exists(back_mockup_path):
                    back_mock_img = Image.open(back_mockup_path).convert("RGBA")
                    processor.add_artwork_layer(
                        image=back_mock_img,
                        name="T-Shirt Back Mockup",
                        top=0,
                        left=0,
                        opacity=255,
                        visible=False # hidden by default in Photoshop layer list for clean front view
                    )
            
            processor.add_artwork_layer(
                image=transformed_back,
                name="Back Artwork Layer",
                top=int(round(zone_y + rel_y)),
                left=int(round(zone_x + rel_x)),
                opacity=255,
                visible=True
            )

        # Write PSD & composite preview
        processor.export_psd(psd_output_path)
        processor.export_preview_png(preview_png_path, max_size=1200)

        file_size = os.path.getsize(psd_output_path) if os.path.exists(psd_output_path) else 0

        # Save DesignJob
        job = DesignJob(
            job_code=job_code,
            garment_color=color,
            garment_style=style,
            pattern_id=pattern_id,
            pattern_name=pattern.name,
            status="completed",
            front_artwork_path=front_artwork_id,
            back_artwork_path=back_artwork_id,
            output_psd_path=psd_output_path,
            preview_png_path=preview_png_path,
            file_size_bytes=file_size,
            placement_config=json.dumps(transforms),
            completed_at=datetime.utcnow()
        )
        db.add(job)
        
        # Log Analytics Event
        event = AnalyticsEvent(
            event_type="design_generated",
            entity_id=job_code,
            details=json.dumps({
                "color": color,
                "style": style,
                "pattern_id": pattern_id,
                "file_size": file_size
            })
        )
        db.add(event)
        db.commit()
        db.refresh(job)

        return job
