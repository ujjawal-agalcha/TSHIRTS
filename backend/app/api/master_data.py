from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database.connection import get_db
from app.models.garment import TshirtColor, TshirtStyle, TshirtSize, TshirtProduct
from app.models.inventory import Supplier

router = APIRouter(prefix="/master-data", tags=["Master Data"])

@router.get("/summary")
def get_master_data_summary(db: Session = Depends(get_db)):
    colors = db.query(TshirtColor).filter(TshirtColor.is_active == True).all()
    styles = db.query(TshirtStyle).filter(TshirtStyle.is_active == True).all()
    sizes = db.query(TshirtSize).filter(TshirtSize.is_active == True).order_by(TshirtSize.sort_order.asc()).all()
    suppliers = db.query(Supplier).all()
    products = db.query(TshirtProduct).all()
    
    return {
        "colors": [{"id": c.id, "name": c.name, "code": c.code, "hex": c.hex_value} for c in colors],
        "styles": [{"id": s.id, "name": s.name, "code": s.code, "description": s.description} for s in styles],
        "sizes": [{"id": sz.id, "name": sz.name, "sort_order": sz.sort_order} for sz in sizes],
        "suppliers": [{"id": sp.id, "name": sp.name, "contact": sp.contact_name, "email": sp.email} for sp in suppliers],
        "products": [{"id": p.id, "name": p.name} for p in products]
    }

@router.post("/colors")
def add_color(name: str, code: str, hex_value: str = "#000000", db: Session = Depends(get_db)):
    c = TshirtColor(name=name, code=code, hex_value=hex_value)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"status": "created", "color": {"id": c.id, "name": c.name, "code": c.code, "hex": c.hex_value}}

@router.post("/styles")
def add_style(name: str, code: str, description: str = "", db: Session = Depends(get_db)):
    s = TshirtStyle(name=name, code=code, description=description)
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"status": "created", "style": {"id": s.id, "name": s.name, "code": s.code}}
