import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.design_job import DesignJob
from app.schemas.schemas import (
    GenerateDesignRequest,
    PreviewDesignRequest,
    DesignJobResponse
)
from app.services.design_service import DesignService

router = APIRouter(tags=["Design Generator"])

@router.post("/design/upload")
async def upload_artwork(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    valid_exts = [".png", ".jpg", ".jpeg", ".webp", ".svg"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in valid_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported format. Allowed: {', '.join(valid_exts)}")
    
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        
    result = DesignService.save_uploaded_artwork(contents, file.filename, db)
    return result

@router.post("/design/preview")
def preview_design(
    payload: PreviewDesignRequest,
    db: Session = Depends(get_db)
):
    transform_dict = payload.transform.model_dump() if payload.transform else {}
    preview_url = DesignService.generate_composite_preview(
        color=payload.color,
        side=payload.side,
        pattern_id=payload.pattern_id,
        artwork_filename=payload.artwork_filename,
        transform=transform_dict,
        db=db
    )
    return {"preview_url": preview_url}

@router.post("/design/generate", response_model=DesignJobResponse)
def generate_design_psd(
    payload: GenerateDesignRequest,
    db: Session = Depends(get_db)
):
    try:
        transforms_dict = {k: v.model_dump() for k, v in payload.transforms.items()}
        job = DesignService.generate_print_ready_psd(
            color=payload.color,
            style=payload.style,
            pattern_id=payload.pattern_id,
            front_artwork_id=payload.front_artwork_id,
            back_artwork_id=payload.back_artwork_id,
            transforms=transforms_dict,
            db=db
        )
        
        res = DesignJobResponse.model_validate(job)
        res.download_url = f"/api/design/download/{job.id}"
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PSD generation failed: {str(e)}")

@router.get("/design/download/{job_id}")
def download_generated_psd(
    job_id: int,
    db: Session = Depends(get_db)
):
    job = db.query(DesignJob).filter(DesignJob.id == job_id).first()
    if not job or not job.output_psd_path or not os.path.exists(job.output_psd_path):
        raise HTTPException(status_code=404, detail="Generated PSD file not found.")
    
    filename = os.path.basename(job.output_psd_path)
    return FileResponse(
        path=job.output_psd_path,
        media_type="image/vnd.adobe.photoshop",
        filename=filename
    )

@router.get("/design-jobs", response_model=List[DesignJobResponse])
def list_design_jobs(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    jobs = db.query(DesignJob).order_by(DesignJob.created_at.desc()).limit(limit).all()
    results = []
    for j in jobs:
        r = DesignJobResponse.model_validate(j)
        r.download_url = f"/api/design/download/{j.id}"
        results.append(r)
    return results
