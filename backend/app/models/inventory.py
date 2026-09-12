from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True)
    contact_name = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    lead_time_days = Column(Integer, default=7)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    inventory_items = relationship("Inventory", back_populates="supplier")

class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False) # e.g. OS-BLK-L
    product_name = Column(String(120), default="Heavyweight Cotton Tee")
    color = Column(String(50), nullable=False) # White, Black
    style = Column(String(50), nullable=False) # Oversized, Regular
    size = Column(String(20), nullable=False) # S, M, L, XL, XXL
    
    stock_quantity = Column(Integer, default=0)
    reorder_level = Column(Integer, default=15)
    
    cost_price = Column(Float, default=7.50)
    selling_price = Column(Float, default=24.99)
    
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    last_restocked_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    supplier = relationship("Supplier", back_populates="inventory_items")
