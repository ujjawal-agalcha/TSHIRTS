from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base

class TemplateCategory(Base):
    __tablename__ = "template_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    code = Column(String(50), nullable=False, unique=True)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Template(Base):
    __tablename__ = "templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # e.g. "Black Oversized Hoodie"
    code = Column(String(80), nullable=True, unique=True) # unique identifier/slug
    category = Column(String(50), default="T-Shirt") # T-Shirt, Hoodie, Track Pant, Sweatshirt, Lower, etc.
    color = Column(String(50), default="Black") # Black, White, Grey, etc.
    style = Column(String(50), default="Oversized") # Oversized, Regular, Relaxed, etc.
    description = Column(Text, nullable=True)
    status = Column(String(20), default="active") # "active", "inactive"
    canvas_width = Column(Integer, default=2700)
    canvas_height = Column(Integer, default=2643)
    master_psd_path = Column(String(255), nullable=True)
    preview_front_black = Column(String(255), default="/mockups/black_front.png")
    preview_front_white = Column(String(255), default="/mockups/white_front.png")
    preview_back_black = Column(String(255), default="/mockups/black_back.png")
    preview_back_white = Column(String(255), default="/mockups/white_back.png")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    assets = relationship("TemplateAsset", back_populates="template", cascade="all, delete-orphan")
    zones = relationship("PrintZone", back_populates="template", cascade="all, delete-orphan")

class TemplateAsset(Base):
    __tablename__ = "template_assets"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=False)
    view = Column(String(50), nullable=False) # front, back, left, right, sleeve_left, sleeve_right, hood, pocket, custom
    file_path = Column(String(255), nullable=False) # relative or absolute path on disk
    width = Column(Integer, default=2700)
    height = Column(Integer, default=2643)
    created_at = Column(DateTime, default=datetime.utcnow)

    template = relationship("Template", back_populates="assets")

class PrintZone(Base):
    __tablename__ = "print_zones"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=False)
    side = Column(String(20), nullable=False, default="front") # "front", "back", etc. (kept for backward compatibility)
    view = Column(String(50), nullable=False, default="front") # extensible view identifier: front, back, sleeve_left, hood, etc.
    zone_code = Column(String(50), nullable=False) # LEFT_CHEST, CENTER_CHEST, FULL_FRONT, LEFT_LEG, etc.
    name = Column(String(100), nullable=False) # "Front Center", "Left Leg", etc.
    x = Column(Float, nullable=False, default=864) # X pixel coordinate in template image space
    y = Column(Float, nullable=False, default=640) # Y pixel coordinate in template image space
    width = Column(Float, nullable=False, default=970) # Width in pixels
    height = Column(Float, nullable=False, default=1451) # Height in pixels
    rotation = Column(Float, default=0.0) # degrees
    scale = Column(Float, default=1.0)
    fit_mode = Column(String(20), default="contain") # contain, cover, width, height, original, custom
    safe_margin = Column(Float, default=20.0) # margin in pixels
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    template = relationship("Template", back_populates="zones")

