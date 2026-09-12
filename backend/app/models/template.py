from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base

class Template(Base):
    __tablename__ = "templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # e.g. "Oversized Heavyweight Template"
    code = Column(String(50), nullable=False, unique=True) # "oversized_master"
    canvas_width = Column(Integer, default=2700)
    canvas_height = Column(Integer, default=2643)
    master_psd_path = Column(String(255), nullable=True)
    preview_front_black = Column(String(255), default="/static/mockups/black_front.png")
    preview_front_white = Column(String(255), default="/static/mockups/white_front.png")
    preview_back_black = Column(String(255), default="/static/mockups/black_back.png")
    preview_back_white = Column(String(255), default="/static/mockups/white_back.png")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    zones = relationship("PrintZone", back_populates="template", cascade="all, delete-orphan")

class PrintZone(Base):
    __tablename__ = "print_zones"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=False)
    side = Column(String(10), nullable=False) # "front" or "back"
    zone_code = Column(String(50), nullable=False) # LEFT_CHEST, CENTER_CHEST, FULL_FRONT, etc.
    name = Column(String(100), nullable=False) # "Left Chest", "Center Chest", etc.
    x = Column(Float, nullable=False, default=864) # X pixel coordinate
    y = Column(Float, nullable=False, default=640) # Y pixel coordinate
    width = Column(Float, nullable=False, default=970) # Width in pixels
    height = Column(Float, nullable=False, default=1451) # Height in pixels
    rotation = Column(Float, default=0.0) # degrees
    scale = Column(Float, default=1.0)
    fit_mode = Column(String(20), default="contain") # contain, cover, width, height, original, custom
    safe_margin = Column(Float, default=20.0) # margin in pixels
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    template = relationship("Template", back_populates="zones")
