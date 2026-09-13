import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.database.seed import seed_default_patterns
from app.models.pattern import Pattern
from app.schemas.schemas import PatternResponse, PatternCreate, PatternUpdate

router = APIRouter(prefix="/patterns", tags=["Patterns"])

DEFAULT_PATTERN_IDS = {
    "front_left_chest",
    "front_center_small",
    "front_center_large",
    "front_full",
    "back_center",
    "back_full",
    "small_front_full_back",
    "front_center_back_full",
    "front_full_back_full",
    "front_small_back_center",
    "front_typography_back_graphic",
    "back_only",
    "front_only",
    "small_logo_front_large_graphic_back",
    "custom_front_custom_back"
}

def to_pattern_response(p: Pattern) -> PatternResponse:
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
        sort_order=p.sort_order,
        is_custom=(p.pattern_id not in DEFAULT_PATTERN_IDS)
    )

@router.get("", response_model=List[PatternResponse])
def list_patterns(
    include_inactive: bool = Query(False, description="Include disabled/inactive patterns"),
    db: Session = Depends(get_db)
):
    query = db.query(Pattern)
    if not include_inactive:
        query = query.filter(Pattern.is_active == True)
    patterns = query.order_by(Pattern.sort_order.asc(), Pattern.id.asc()).all()
    return [to_pattern_response(p) for p in patterns]

@router.post("/restore-defaults", response_model=List[PatternResponse])
def restore_default_patterns(db: Session = Depends(get_db)):
    """
    Safely seeds/restores missing default patterns without deleting user-created patterns.
    """
    seed_default_patterns(db)
    patterns = db.query(Pattern).order_by(Pattern.sort_order.asc()).all()
    return [to_pattern_response(p) for p in patterns]

@router.get("/{pattern_id}", response_model=PatternResponse)
def get_pattern(pattern_id: str, db: Session = Depends(get_db)):
    p = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pattern not found.")
    return to_pattern_response(p)

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
    return to_pattern_response(p)

@router.put("/{pattern_id}", response_model=PatternResponse)
def update_pattern(pattern_id: str, payload: PatternUpdate, db: Session = Depends(get_db)):
    p = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pattern not found.")
    
    if payload.name is not None:
        p.name = payload.name
    if payload.description is not None:
        p.description = payload.description
    if payload.category is not None:
        p.category = payload.category
    if payload.preview_badge is not None:
        p.preview_badge = payload.preview_badge
    if payload.front_slots is not None:
        p.front_slots = json.dumps(payload.front_slots)
    if payload.back_slots is not None:
        p.back_slots = json.dumps(payload.back_slots)
    if payload.required_uploads is not None:
        p.required_uploads = json.dumps(payload.required_uploads)
    if payload.is_active is not None:
        p.is_active = payload.is_active
    if payload.sort_order is not None:
        p.sort_order = payload.sort_order

    db.commit()
    db.refresh(p)
    return to_pattern_response(p)

@router.patch("/{pattern_id}/toggle", response_model=PatternResponse)
def toggle_pattern_active(pattern_id: str, db: Session = Depends(get_db)):
    p = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pattern not found.")
    
    p.is_active = not p.is_active
    db.commit()
    db.refresh(p)
    return to_pattern_response(p)

@router.post("/{pattern_id}/duplicate", response_model=PatternResponse)
def duplicate_pattern(pattern_id: str, db: Session = Depends(get_db)):
    p = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pattern not found.")
    
    unique_suffix = uuid.uuid4().hex[:6]
    new_id = f"{p.pattern_id}_copy_{unique_suffix}"
    new_name = f"{p.name} (Copy)"

    max_sort = db.query(Pattern).order_by(Pattern.sort_order.desc()).first()
    new_sort = (max_sort.sort_order + 1) if max_sort else 16

    new_p = Pattern(
        pattern_id=new_id,
        name=new_name,
        description=f"Duplicate of {p.name}: {p.description or ''}",
        category="Custom",
        preview_badge=p.preview_badge,
        front_slots=p.front_slots,
        back_slots=p.back_slots,
        required_uploads=p.required_uploads,
        is_active=True,
        sort_order=new_sort
    )
    db.add(new_p)
    db.commit()
    db.refresh(new_p)
    return to_pattern_response(new_p)

@router.delete("/{pattern_id}")
def delete_pattern(pattern_id: str, db: Session = Depends(get_db)):
    if pattern_id in DEFAULT_PATTERN_IDS:
        raise HTTPException(
            status_code=400,
            detail=f"Default pattern '{pattern_id}' cannot be deleted. You can disable it instead."
        )

    p = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pattern not found.")

    db.delete(p)
    db.commit()
    return {"message": f"User pattern '{pattern_id}' deleted successfully."}
