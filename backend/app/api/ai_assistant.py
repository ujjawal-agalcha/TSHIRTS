from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.schemas import ChatRequest, ChatResponse
from app.services.ai_service import AIAssistantService

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

@router.post("/chat", response_model=ChatResponse)
def chat_with_assistant(payload: ChatRequest, db: Session = Depends(get_db)):
    result = AIAssistantService.process_query(payload.message, db)
    return ChatResponse(
        reply=result["reply"],
        suggested_actions=result.get("suggested_actions", []),
        data=result.get("data")
    )
