from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Print Zone & Template ---
class PrintZoneBase(BaseModel):
    zone_code: str
    name: str
    side: str # front / back
    x: float
    y: float
    width: float
    height: float
    rotation: float = 0.0
    scale: float = 1.0
    fit_mode: str = "contain" # contain, cover, width, height, original, custom
    safe_margin: float = 20.0
    is_active: bool = True

class PrintZoneUpdate(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    rotation: Optional[float] = None
    scale: Optional[float] = None
    fit_mode: Optional[str] = None
    safe_margin: Optional[float] = None
    is_active: Optional[bool] = None

class PrintZoneResponse(PrintZoneBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    template_id: int

class TemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str
    canvas_width: int
    canvas_height: int
    preview_front_black: str
    preview_front_white: str
    preview_back_black: str
    preview_back_white: str
    zones: List[PrintZoneResponse] = []

# --- Pattern ---
class PatternSlotDef(BaseModel):
    slot: str
    zone_code: str
    label: str
    required: bool = True

class PatternResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    pattern_id: str
    name: str
    description: Optional[str] = None
    category: str
    preview_badge: str
    front_slots: List[Dict[str, Any]] = []
    back_slots: List[Dict[str, Any]] = []
    required_uploads: List[str] = []
    is_active: bool
    sort_order: int

class PatternCreate(BaseModel):
    pattern_id: str
    name: str
    description: Optional[str] = None
    category: str = "Standard"
    preview_badge: str = "Front + Back"
    front_slots: List[Dict[str, Any]] = []
    back_slots: List[Dict[str, Any]] = []
    required_uploads: List[str] = ["front"]

# --- Design Generator ---
class SlotTransform(BaseModel):
    offset_x: float = 0.0
    offset_y: float = 0.0
    scale_multiplier: float = 1.0
    rotation: float = 0.0
    fit_mode: Optional[str] = "contain"

class GenerateDesignRequest(BaseModel):
    color: str
    style: str
    pattern_id: str
    front_artwork_id: Optional[str] = None
    back_artwork_id: Optional[str] = None
    transforms: Dict[str, SlotTransform] = Field(default_factory=dict)

class PreviewDesignRequest(BaseModel):
    color: str
    style: str
    side: str
    pattern_id: str
    artwork_filename: Optional[str] = None
    transform: Optional[SlotTransform] = None

class DesignJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    job_code: str
    garment_color: str
    garment_style: str
    pattern_id: str
    pattern_name: Optional[str]
    status: str
    error_message: Optional[str]
    output_psd_path: Optional[str]
    preview_png_path: Optional[str]
    file_size_bytes: int
    download_url: Optional[str] = None
    created_at: datetime

# --- Inventory ---
class InventoryItemCreate(BaseModel):
    sku: str
    product_name: str = "Heavyweight Cotton Tee"
    color: str
    style: str
    size: str
    stock_quantity: int = 0
    reorder_level: int = 15
    cost_price: float = 7.50
    selling_price: float = 24.99
    supplier_id: Optional[int] = None

class InventoryItemUpdate(BaseModel):
    stock_quantity: Optional[int] = None
    reorder_level: Optional[int] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    is_active: Optional[bool] = None

class InventoryStockAdjust(BaseModel):
    delta: int
    reason: Optional[str] = "Manual stock adjustment"

class InventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sku: str
    product_name: str
    color: str
    style: str
    size: str
    stock_quantity: int
    reorder_level: int
    cost_price: float
    selling_price: float
    supplier_id: Optional[int]
    is_active: bool
    supplier_name: Optional[str] = None

class SupplierResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    contact_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    lead_time_days: int

# --- AI Assistant ---
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str
    suggested_actions: List[str] = []
    data: Optional[Dict[str, Any]] = None
