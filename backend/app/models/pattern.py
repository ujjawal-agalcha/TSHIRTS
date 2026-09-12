from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from datetime import datetime
from app.database.connection import Base
import json

class Pattern(Base):
    __tablename__ = "patterns"
    
    id = Column(Integer, primary_key=True, index=True)
    pattern_id = Column(String(80), nullable=False, unique=True, index=True) # e.g. "front_left_chest", "small_front_full_back"
    name = Column(String(120), nullable=False)
    description = Column(String(255), nullable=True)
    category = Column(String(50), default="Standard") # Standard, Front-Only, Back-Only, Dual-Print, Full
    preview_badge = Column(String(50), default="Front + Back")
    
    # JSON encoded slot configurations
    # front_slots: [{"slot": "front_left", "zone_code": "LEFT_CHEST", "label": "Front Left Chest", "required": true}]
    front_slots = Column(Text, default="[]")
    # back_slots: [{"slot": "back_full", "zone_code": "FULL_BACK", "label": "Full Back Graphic", "required": true}]
    back_slots = Column(Text, default="[]")
    
    # JSON list of required upload fields, e.g. ["front", "back"]
    required_uploads = Column(Text, default="[\"front\"]")
    
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def get_front_slots(self):
        try:
            return json.loads(self.front_slots)
        except:
            return []

    def get_back_slots(self):
        try:
            return json.loads(self.back_slots)
        except:
            return []

    def get_required_uploads(self):
        try:
            return json.loads(self.required_uploads)
        except:
            return ["front"]
