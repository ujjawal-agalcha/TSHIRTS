from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.database.connection import Base

class TshirtProduct(Base):
    __tablename__ = "tshirt_products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # e.g. "Heavyweight Cotton Tee"
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class TshirtColor(Base):
    __tablename__ = "tshirt_colors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True) # White, Black
    code = Column(String(20), nullable=False) # "white", "black"
    hex_value = Column(String(10), default="#FFFFFF")
    is_active = Column(Boolean, default=True)

class TshirtStyle(Base):
    __tablename__ = "tshirt_styles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True) # Regular, Oversized
    code = Column(String(30), nullable=False) # "regular", "oversized"
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)

class TshirtSize(Base):
    __tablename__ = "tshirt_sizes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(20), nullable=False, unique=True) # XS, S, M, L, XL, XXL
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
