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
    Preview2x2Request,
    DesignJobResponse
)
from app.services.design_service import DesignService

router = APIRouter(tags=["Design Generator"])

@router.post("/design/upload")
async def upload_artwork(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    valid_exts = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".tif", ".tiff"]
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

@router.post("/design/preview-2x2")
def preview_design_2x2(
    payload: Preview2x2Request,
    db: Session = Depends(get_db)
):
    try:
        transforms_dict = {k: v.model_dump() for k, v in payload.transforms.items()}
        mockup_dict = payload.mockup_params.model_dump() if payload.mockup_params else None
        preview_url = DesignService.generate_2x2_preview(
            pattern_id=payload.pattern_id,
            front_artwork_id=payload.front_artwork_id,
            back_artwork_id=payload.back_artwork_id,
            transforms=transforms_dict,
            include_labels=payload.include_labels,
            mode=payload.mode,
            mockup_params=mockup_dict,
            db=db
        )
        return {"preview_url": preview_url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/design/generate", response_model=DesignJobResponse)
def generate_design(
    payload: GenerateDesignRequest,
    db: Session = Depends(get_db)
):
    try:
        transforms_dict = {k: v.model_dump() for k, v in payload.transforms.items()}
        mockup_dict = payload.mockup_params.model_dump() if payload.mockup_params else None
        job = DesignService.generate_print_ready_png(
            color=payload.color,
            style=payload.style,
            pattern_id=payload.pattern_id,
            front_artwork_id=payload.front_artwork_id,
            back_artwork_id=payload.back_artwork_id,
            transforms=transforms_dict,
            include_labels=payload.include_labels,
            generate_mockup=payload.generate_mockup,
            mockup_params=mockup_dict,
            db=db
        )
        
        res = DesignJobResponse.model_validate(job)
        if job.output_png_path:
            res.filename = os.path.basename(job.output_png_path)
            res.png_url = f"/generated/{res.filename}"
        else:
            res.filename = f"{job.job_code}.png"
            res.png_url = f"/generated/{res.filename}"

        if job.output_mockup_png_path:
            mockup_base = os.path.basename(job.output_mockup_png_path)
            res.mockup_png_url = f"/generated/{mockup_base}"
            res.mockup_download_url = f"/api/design/download/{job.id}?type=mockup"

        res.download_url = f"/api/design/download/{job.id}?type=production"
        res.width = job.canvas_width or 5400
        res.height = job.canvas_height or 5286
        res.format = "PNG"
        res.color_mode = "RGBA"
        res.views = ["black_front", "black_back", "white_front", "white_back"]
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PNG generation failed: {str(e)}")

@router.get("/design/download/{job_id}")
def download_generated_design(
    job_id: int,
    type: str = "production",
    db: Session = Depends(get_db)
):
    job = db.query(DesignJob).filter(DesignJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Design job not found.")

    target_type = (type or "production").lower()

    # If realistic mockup is requested
    if target_type == "mockup":
        if job.output_mockup_png_path and os.path.exists(job.output_mockup_png_path):
            filename = os.path.basename(job.output_mockup_png_path)
            return FileResponse(
                path=job.output_mockup_png_path,
                media_type="image/png",
                filename=filename
            )
        # Fallback to production if mockup wasn't generated
        elif job.output_png_path and os.path.exists(job.output_png_path):
            filename = os.path.basename(job.output_png_path)
            return FileResponse(
                path=job.output_png_path,
                media_type="image/png",
                filename=filename
            )

    # Primary production output: Clean PNG
    if job.output_png_path and os.path.exists(job.output_png_path):
        filename = os.path.basename(job.output_png_path)
        return FileResponse(
            path=job.output_png_path,
            media_type="image/png",
            filename=filename
        )
    # Fallback to PSD if job was created with legacy PSD flow
    elif job.output_psd_path and os.path.exists(job.output_psd_path):
        filename = os.path.basename(job.output_psd_path)
        return FileResponse(
            path=job.output_psd_path,
            media_type="image/vnd.adobe.photoshop",
            filename=filename
        )
    else:
        raise HTTPException(status_code=404, detail="Generated design file not found on disk.")

@router.get("/design-jobs", response_model=List[DesignJobResponse])
def list_design_jobs(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    jobs = db.query(DesignJob).order_by(DesignJob.created_at.desc()).limit(limit).all()
    results = []
    for j in jobs:
        r = DesignJobResponse.model_validate(j)
        if j.output_png_path:
            r.filename = os.path.basename(j.output_png_path)
            r.png_url = f"/generated/{r.filename}"
        elif j.output_psd_path:
            r.filename = os.path.basename(j.output_psd_path)
        r.download_url = f"/api/design/download/{j.id}"
        r.width = j.canvas_width or 5400
        r.height = j.canvas_height or 5286
        r.format = j.format or "PNG"
        r.color_mode = j.color_mode or "RGBA"
        r.views = ["black_front", "black_back", "white_front", "white_back"]
        results.append(r)
    return results
