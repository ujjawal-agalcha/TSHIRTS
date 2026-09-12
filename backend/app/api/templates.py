from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.template import Template, PrintZone
from app.schemas.schemas import TemplateResponse, PrintZoneResponse, PrintZoneUpdate, PrintZoneBase

router = APIRouter(prefix="/templates", tags=["Templates & Calibration"])

@router.get("", response_model=List[TemplateResponse])
def list_templates(db: Session = Depends(get_db)):
    return db.query(Template).filter(Template.is_active == True).all()

@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")
    return template

@router.put("/{template_id}/zones/{zone_id}", response_model=PrintZoneResponse)
def update_zone_calibration(
    template_id: int,
    zone_id: int,
    payload: PrintZoneUpdate,
    db: Session = Depends(get_db)
):
    zone = db.query(PrintZone).filter(PrintZone.id == zone_id, PrintZone.template_id == template_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Print zone not found.")
    
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(zone, field, value)
            
    db.commit()
    db.refresh(zone)
    return zone

@router.post("/{template_id}/zones", response_model=PrintZoneResponse)
def add_print_zone(
    template_id: int,
    payload: PrintZoneBase,
    db: Session = Depends(get_db)
):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")
        
    zone = PrintZone(template_id=template_id, **payload.model_dump())
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone
