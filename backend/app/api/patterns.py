import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.pattern import Pattern
from app.schemas.schemas import PatternResponse, PatternCreate

router = APIRouter(prefix="/patterns", tags=["Patterns"])

@router.get("", response_model=List[PatternResponse])
def list_patterns(db: Session = Depends(get_db)):
    patterns = db.query(Pattern).filter(Pattern.is_active == True).order_by(Pattern.sort_order.asc()).all()
    results = []
    for p in patterns:
        results.append(PatternResponse(
            id=p.id,
            pattern_id=p.pattern_id,
            name=p.name,
            description=p.description,
            category=p.category,
            preview_badge=p.preview_badge,
            front_slots=p.get_front_slots(),
            back_slots=p.get_back_slots(),
            required_uploads=p.get_required_uploads(),
            is_active=p.is_active,
            sort_order=p.sort_order
        ))
    return results

@router.get("/{pattern_id}", response_model=PatternResponse)
def get_pattern(pattern_id: str, db: Session = Depends(get_db)):
    p = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pattern not found.")
    return PatternResponse(
        id=p.id,
        pattern_id=p.pattern_id,
        name=p.name,
        description=p.description,
        category=p.category,
        preview_badge=p.preview_badge,
        front_slots=p.get_front_slots(),
        back_slots=p.get_back_slots(),
        required_uploads=p.get_required_uploads(),
        is_active=p.is_active,
        sort_order=p.sort_order
    )

@router.post("", response_model=PatternResponse)
def create_pattern(payload: PatternCreate, db: Session = Depends(get_db)):
    existing = db.query(Pattern).filter(Pattern.pattern_id == payload.pattern_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Pattern ID already exists.")
        
    p = Pattern(
        pattern_id=payload.pattern_id,
        name=payload.name,
        description=payload.description,
        category=payload.category,
        preview_badge=payload.preview_badge,
        front_slots=json.dumps(payload.front_slots),
        back_slots=json.dumps(payload.back_slots),
        required_uploads=json.dumps(payload.required_uploads)
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    
    return PatternResponse(
        id=p.id,
        pattern_id=p.pattern_id,
        name=p.name,
        description=p.description,
        category=p.category,
        preview_badge=p.preview_badge,
        front_slots=p.get_front_slots(),
        back_slots=p.get_back_slots(),
        required_uploads=p.get_required_uploads(),
        is_active=p.is_active,
        sort_order=p.sort_order
    )
