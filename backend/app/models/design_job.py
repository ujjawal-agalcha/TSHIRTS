from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime
from datetime import datetime
from app.database.connection import Base

class DesignJob(Base):
    __tablename__ = "design_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    job_code = Column(String(120), unique=True, index=True, nullable=False)
    garment_color = Column(String(50), nullable=False) # "Black", "White"
    garment_style = Column(String(50), nullable=False) # "Oversized", "Regular"
    pattern_id = Column(String(80), nullable=False)
    pattern_name = Column(String(120), nullable=True)
    
    status = Column(String(30), default="pending") # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)
    
    front_artwork_path = Column(String(255), nullable=True)
    back_artwork_path = Column(String(255), nullable=True)
    
    output_psd_path = Column(String(255), nullable=True)
    output_png_path = Column(String(255), nullable=True)
    output_mockup_png_path = Column(String(255), nullable=True)
    preview_png_path = Column(String(255), nullable=True)
    file_size_bytes = Column(Integer, default=0)
    canvas_width = Column(Integer, default=5400)
    canvas_height = Column(Integer, default=5286)
    format = Column(String(20), default="PNG")
    color_mode = Column(String(20), default="RGBA")
    
    placement_config = Column(Text, default="{}") # JSON string of slot transforms
    
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class Artwork(Base):
    __tablename__ = "artworks"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    channels = Column(Integer, default=4)
    file_format = Column(String(20), default="PNG")
    has_transparency = Column(Boolean, default=True)
    estimated_dpi = Column(Float, default=300.0)
    created_at = Column(DateTime, default=datetime.utcnow)
