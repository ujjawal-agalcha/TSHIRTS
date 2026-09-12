from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.inventory import Inventory, Supplier
from app.schemas.schemas import InventoryItemCreate, InventoryItemUpdate

class InventoryService:
    @staticmethod
    def get_items(
        db: Session,
        query: Optional[str] = None,
        color: Optional[str] = None,
        style: Optional[str] = None,
        low_stock_only: bool = False
    ) -> List[Inventory]:
        q = db.query(Inventory).filter(Inventory.is_active == True)
        
        if query:
            search = f"%{query}%"
            q = q.filter(
                or_(
                    Inventory.sku.ilike(search),
                    Inventory.product_name.ilike(search),
                    Inventory.color.ilike(search),
                    Inventory.style.ilike(search),
                    Inventory.size.ilike(search)
                )
            )
            
        if color:
            q = q.filter(Inventory.color.ilike(color))
        if style:
            q = q.filter(Inventory.style.ilike(style))
        if low_stock_only:
            q = q.filter(Inventory.stock_quantity <= Inventory.reorder_level)
            
        return q.order_by(Inventory.sku.asc()).all()

    @staticmethod
    def adjust_stock(db: Session, item_id: int, delta: int) -> Inventory:
        item = db.query(Inventory).filter(Inventory.id == item_id).first()
        if not item:
            raise ValueError(f"Inventory item {item_id} not found.")
        item.stock_quantity = max(0, item.stock_quantity + delta)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def create_item(db: Session, data: InventoryItemCreate) -> Inventory:
        existing = db.query(Inventory).filter(Inventory.sku == data.sku).first()
        if existing:
            raise ValueError(f"SKU {data.sku} already exists.")
        item = Inventory(**data.dict())
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def update_item(db: Session, item_id: int, data: InventoryItemUpdate) -> Inventory:
        item = db.query(Inventory).filter(Inventory.id == item_id).first()
        if not item:
            raise ValueError(f"Inventory item {item_id} not found.")
        for field, value in data.dict(exclude_unset=True).items():
            setattr(item, field, value)
        db.commit()
        db.refresh(item)
        return item
