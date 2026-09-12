from typing import Dict, Any, List, Optional
from app.models.pattern import Pattern
from app.models.template import PrintZone

class PatternEngine:
    @staticmethod
    def get_pattern_requirements(pattern: Pattern) -> Dict[str, Any]:
        """
        Returns slot definitions, upload requirements, and labels for a given pattern.
        """
        front_slots = pattern.get_front_slots()
        back_slots = pattern.get_back_slots()
        required_uploads = pattern.get_required_uploads()
        
        return {
            "pattern_id": pattern.pattern_id,
            "name": pattern.name,
            "category": pattern.category,
            "requires_front": "front" in required_uploads,
            "requires_back": "back" in required_uploads,
            "required_uploads": required_uploads,
            "front_slots": front_slots,
            "back_slots": back_slots
        }

    @staticmethod
    def resolve_slot_zone(
        slots_def: List[Dict[str, Any]],
        zones_by_code: Dict[str, PrintZone]
    ) -> List[Dict[str, Any]]:
        """
        Resolves each slot in a pattern to its current calibrated coordinates from the database.
        """
        resolved = []
        for slot in slots_def:
            zone_code = slot.get("zone_code")
            zone = zones_by_code.get(zone_code)
            if zone:
                resolved.append({
                    "slot_id": slot.get("slot"),
                    "label": slot.get("label", zone.name),
                    "zone_code": zone_code,
                    "x": zone.x,
                    "y": zone.y,
                    "width": zone.width,
                    "height": zone.height,
                    "rotation": zone.rotation,
                    "scale": zone.scale,
                    "fit_mode": zone.fit_mode,
                    "safe_margin": zone.safe_margin
                })
            else:
                # Fallback to defaults
                resolved.append({
                    "slot_id": slot.get("slot"),
                    "label": slot.get("label", "Custom Zone"),
                    "zone_code": zone_code,
                    "x": 864,
                    "y": 640,
                    "width": 970,
                    "height": 1451,
                    "rotation": 0.0,
                    "scale": 1.0,
                    "fit_mode": "contain",
                    "safe_margin": 20.0
                })
        return resolved
