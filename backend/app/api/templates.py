import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.connection import get_db
from app.models.template import Template, PrintZone, TemplateCategory
from app.schemas.schemas import (
    TemplateResponse, PrintZoneResponse, PrintZoneUpdate, PrintZoneBase,
    TemplateCreateRequest, TemplateUpdateRequest,
    TemplateCategoryResponse, TemplateCategoryCreate,
    TemplateAssetResponse
)
from app.services.template_service import TemplateService

router = APIRouter(prefix="/templates", tags=["Templates & Calibration"])

# ─── List Templates (with filters) ─────────────────────────────────────────
@router.get("", response_model=List[TemplateResponse])
def list_templates(
    q: Optional[str] = Query(None, description="Search by name, category, color, description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    color: Optional[str] = Query(None, description="Filter by color"),
    style: Optional[str] = Query(None, description="Filter by style"),
    status: Optional[str] = Query(None, description="Filter by status: active or inactive"),
    include_inactive: bool = Query(False, description="Include inactive templates"),
    sort_by: str = Query("recently_created", description="Sort by: recently_created, recently_modified, name"),
    db: Session = Depends(get_db)
):
    return TemplateService.list_templates(
        db=db, q=q, category=category, color=color, style=style,
        status=status, include_inactive=include_inactive, sort_by=sort_by
    )

# ─── Get Template Detail ───────────────────────────────────────────────────
@router.get("/categories", response_model=List[TemplateCategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return TemplateService.list_categories(db)

@router.post("/categories", response_model=TemplateCategoryResponse)
def add_category(payload: TemplateCategoryCreate, db: Session = Depends(get_db)):
    return TemplateService.add_category(payload.name, payload.description, db)

@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(template_id: int, db: Session = Depends(get_db)):
    template = TemplateService.get_template(template_id, db)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")
    return template

# ─── Create Template (with optional multi-view image uploads) ──────────────
@router.post("", response_model=TemplateResponse)
async def create_template(
    name: str = Form(...),
    category: str = Form("Custom"),
    color: str = Form("Black"),
    style: str = Form("Standard"),
    description: Optional[str] = Form(None),
    status: str = Form("active"),
    front: Optional[UploadFile] = File(None),
    back: Optional[UploadFile] = File(None),
    left_sleeve: Optional[UploadFile] = File(None),
    right_sleeve: Optional[UploadFile] = File(None),
    hood: Optional[UploadFile] = File(None),
    pocket: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    view_files = {}
    view_filenames = {}
    for view_name, upload in [
        ("front", front), ("back", back), ("left_sleeve", left_sleeve),
        ("right_sleeve", right_sleeve), ("hood", hood), ("pocket", pocket)
    ]:
        if upload:
            content = await upload.read()
            if len(content) > 0:
                view_files[view_name] = content
                view_filenames[view_name] = upload.filename

    try:
        template = TemplateService.create_template(
            name=name, category=category, color=color, style=style,
            description=description, status=status,
            view_files=view_files, view_filenames=view_filenames, db=db
        )
        return template
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ─── Update Template Metadata ─────────────────────────────────────────────
@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: int,
    payload: TemplateUpdateRequest,
    db: Session = Depends(get_db)
):
    template = TemplateService.get_template(template_id, db)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")

    from datetime import datetime
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(template, field, value)
    template.updated_at = datetime.utcnow()
    if payload.status:
        template.is_active = (payload.status != "inactive")
    db.commit()
    db.refresh(template)
    return template

# ─── Duplicate Template ───────────────────────────────────────────────────
@router.post("/{template_id}/duplicate", response_model=TemplateResponse)
def duplicate_template(
    template_id: int,
    new_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    try:
        return TemplateService.duplicate_template(template_id, new_name, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# ─── Toggle Active/Inactive ──────────────────────────────────────────────
@router.patch("/{template_id}/toggle", response_model=TemplateResponse)
def toggle_template(template_id: int, db: Session = Depends(get_db)):
    template = TemplateService.get_template(template_id, db)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")

    if template.status == "active" or template.is_active:
        return TemplateService.deactivate_template(template_id, db)
    else:
        return TemplateService.activate_template(template_id, db)

# ─── Delete Template ─────────────────────────────────────────────────────
@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    template = TemplateService.get_template(template_id, db)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")

    # Don't allow deleting the default T-Shirt template (id=1)
    if template_id == 1:
        raise HTTPException(status_code=400, detail="Cannot delete the default T-Shirt template.")

    db.delete(template)
    db.commit()
    return {"message": f"Template '{template.name}' deleted successfully."}

# ─── Upload Asset to Existing Template ────────────────────────────────────
@router.post("/{template_id}/assets", response_model=TemplateAssetResponse)
async def upload_template_asset(
    template_id: int,
    view: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")
    try:
        asset = TemplateService.add_asset_to_template(
            template_id=template_id, view=view,
            file_bytes=content, original_filename=file.filename, db=db
        )
        return asset
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ─── Print Zone CRUD ─────────────────────────────────────────────────────
@router.get("/{template_id}/zones", response_model=List[PrintZoneResponse])
def list_zones(template_id: int, db: Session = Depends(get_db)):
    template = TemplateService.get_template(template_id, db)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")
    return template.zones

@router.post("/{template_id}/zones", response_model=PrintZoneResponse)
def add_print_zone(
    template_id: int,
    payload: PrintZoneBase,
    db: Session = Depends(get_db)
):
    try:
        zone = TemplateService.add_print_zone(
            template_id=template_id,
            name=payload.name,
            view=payload.view or payload.side,
            zone_code=payload.zone_code,
            x=payload.x, y=payload.y,
            width=payload.width, height=payload.height,
            rotation=payload.rotation, scale=payload.scale,
            fit_mode=payload.fit_mode, safe_margin=payload.safe_margin,
            db=db
        )
        return zone
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{template_id}/zones/{zone_id}", response_model=PrintZoneResponse)
def update_zone_calibration(
    template_id: int,
    zone_id: int,
    payload: PrintZoneUpdate,
    db: Session = Depends(get_db)
):
    try:
        zone = TemplateService.update_print_zone(
            template_id=template_id, zone_id=zone_id,
            data=payload.model_dump(exclude_unset=True), db=db
        )
        return zone
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{template_id}/zones/{zone_id}")
def delete_zone(
    template_id: int,
    zone_id: int,
    db: Session = Depends(get_db)
):
    success = TemplateService.delete_print_zone(template_id, zone_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Print zone not found.")
    return {"message": "Zone deleted successfully."}
