from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("")
def get_analytics(db: Session = Depends(get_db)):
    return AnalyticsService.get_dashboard_metrics(db)
