from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.database.connection import Base

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False, index=True) # "design_generated", "psd_downloaded", "template_calibrated"
    entity_id = Column(String(100), nullable=True) # job_code, pattern_id, etc.
    details = Column(Text, default="{}") # JSON metadata
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
