from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.design_job import DesignJob
from app.models.inventory import Inventory
from app.models.pattern import Pattern

class AnalyticsService:
    @staticmethod
    def get_dashboard_metrics(db: Session) -> Dict[str, Any]:
        total_jobs = db.query(DesignJob).count()
        completed_psds = db.query(DesignJob).filter(DesignJob.status == "completed").count()
        
        # Most used color
        top_color_row = db.query(
            DesignJob.garment_color, func.count(DesignJob.id).label("count")
        ).group_by(DesignJob.garment_color).order_by(desc("count")).first()
        top_color = top_color_row[0] if top_color_row else "Black"
        
        # Most used style
        top_style_row = db.query(
            DesignJob.garment_style, func.count(DesignJob.id).label("count")
        ).group_by(DesignJob.garment_style).order_by(desc("count")).first()
        top_style = top_style_row[0] if top_style_row else "Oversized"

        # Most used pattern
        top_pattern_row = db.query(
            DesignJob.pattern_name, func.count(DesignJob.id).label("count")
        ).group_by(DesignJob.pattern_name).order_by(desc("count")).first()
        top_pattern = top_pattern_row[0] if top_pattern_row else "Small Front + Full Back"

        # Inventory sums
        total_stock = db.query(func.sum(Inventory.stock_quantity)).scalar() or 0
        low_stock_count = db.query(Inventory).filter(Inventory.stock_quantity <= Inventory.reorder_level).count()

        # Recent 10 jobs
        recent_jobs = db.query(DesignJob).order_by(DesignJob.created_at.desc()).limit(10).all()

        # Pattern distribution
        pattern_dist = db.query(
            DesignJob.pattern_name, func.count(DesignJob.id)
        ).group_by(DesignJob.pattern_name).limit(6).all()
        
        # Color distribution
        color_dist = db.query(
            DesignJob.garment_color, func.count(DesignJob.id)
        ).group_by(DesignJob.garment_color).all()

        return {
            "total_designs": total_jobs,
            "total_psd_generated": completed_psds,
            "most_used_color": top_color,
            "most_used_style": top_style,
            "most_used_pattern": top_pattern,
            "total_inventory_units": int(total_stock),
            "low_stock_items_count": low_stock_count,
            "pattern_distribution": [{"name": r[0] or "Unknown", "count": r[1]} for r in pattern_dist],
            "color_distribution": [{"name": r[0] or "Unknown", "count": r[1]} for r in color_dist],
            "recent_jobs": [
                {
                    "id": j.id,
                    "job_code": j.job_code,
                    "color": j.garment_color,
                    "style": j.garment_style,
                    "pattern_name": j.pattern_name,
                    "status": j.status,
                    "file_size_mb": round(j.file_size_bytes / (1024 * 1024), 2),
                    "created_at": j.created_at.strftime("%Y-%m-%d %H:%M"),
                    "download_url": f"/api/design/download/{j.id}"
                }
                for j in recent_jobs
            ]
        }
