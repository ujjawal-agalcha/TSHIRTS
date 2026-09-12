from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.connection import get_db
from app.models.inventory import Inventory, Supplier
from app.schemas.schemas import (
    InventoryResponse,
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryStockAdjust,
    SupplierResponse
)
from app.services.inventory_service import InventoryService

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("", response_model=List[InventoryResponse])
def get_inventory(
    q: Optional[str] = None,
    color: Optional[str] = None,
    style: Optional[str] = None,
    low_stock: bool = False,
    db: Session = Depends(get_db)
):
    items = InventoryService.get_items(db, query=q, color=color, style=style, low_stock_only=low_stock)
    results = []
    for item in items:
        resp = InventoryResponse.model_validate(item)
        if item.supplier:
            resp.supplier_name = item.supplier.name
        results.append(resp)
    return results

@router.post("", response_model=InventoryResponse)
def add_inventory_item(payload: InventoryItemCreate, db: Session = Depends(get_db)):
    try:
        item = InventoryService.create_item(db, payload)
        return InventoryResponse.model_validate(item)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{item_id}", response_model=InventoryResponse)
def update_inventory_item(item_id: int, payload: InventoryItemUpdate, db: Session = Depends(get_db)):
    try:
        item = InventoryService.update_item(db, item_id, payload)
        return InventoryResponse.model_validate(item)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/{item_id}/stock", response_model=InventoryResponse)
def adjust_inventory_stock(item_id: int, payload: InventoryStockAdjust, db: Session = Depends(get_db)):
    try:
        item = InventoryService.adjust_stock(db, item_id, payload.delta)
        return InventoryResponse.model_validate(item)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/suppliers", response_model=List[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).all()
