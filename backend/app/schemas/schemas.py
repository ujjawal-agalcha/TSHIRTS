from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Print Zone & Template ---
class PrintZoneBase(BaseModel):
    zone_code: str
    name: str
    side: str = "front" # front / back (legacy)
    view: str = "front" # extensible view: front, back, sleeve_left, hood, etc.
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
    name: Optional[str] = None
    zone_code: Optional[str] = None
    view: Optional[str] = None
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

# --- Template Asset ---
class TemplateAssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    template_id: int
    view: str
    file_path: str
    width: int
    height: int

class TemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: Optional[str] = None
    category: str = "T-Shirt"
    color: str = "Black"
    style: str = "Oversized"
    description: Optional[str] = None
    status: str = "active"
    canvas_width: int = 2700
    canvas_height: int = 2643
    preview_front_black: Optional[str] = None
    preview_front_white: Optional[str] = None
    preview_back_black: Optional[str] = None
    preview_back_white: Optional[str] = None
    is_active: bool = True
    assets: List[TemplateAssetResponse] = []
    zones: List[PrintZoneResponse] = []

class TemplateCreateRequest(BaseModel):
    name: str
    category: str = "Custom"
    color: str = "Black"
    style: str = "Standard"
    description: Optional[str] = None
    status: str = "active"

class TemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    color: Optional[str] = None
    style: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

# --- Template Category ---
class TemplateCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool = True

class TemplateCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

# --- Design Blending ---
class BlendPreviewRequest(BaseModel):
    x: int = 0
    y: int = 0
    target_width: Optional[int] = None
    target_height: Optional[int] = None
    scale: float = 1.0
    rotation: float = 0.0
    blend_mode: str = "normal"
    blend_strength: float = 100.0
    opacity: float = 100.0

class BlendPreviewResponse(BaseModel):
    preview_url: str
    analysis: Dict[str, Any]

class BlendExportRequest(BaseModel):
    x: int = 0
    y: int = 0
    target_width: Optional[int] = None
    target_height: Optional[int] = None
    scale: float = 1.0
    rotation: float = 0.0
    blend_mode: str = "normal"
    blend_strength: float = 100.0
    opacity: float = 100.0

class BlendExportResponse(BaseModel):
    output_url: str
    width: int
    height: int
    file_size_bytes: int

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
    is_custom: bool = False

class PatternCreate(BaseModel):
    pattern_id: str
    name: str
    description: Optional[str] = None
    category: str = "Standard"
    preview_badge: str = "Front + Back"
    front_slots: List[Dict[str, Any]] = []
    back_slots: List[Dict[str, Any]] = []
    required_uploads: List[str] = ["front"]

class PatternUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    preview_badge: Optional[str] = None
    front_slots: Optional[List[Dict[str, Any]]] = None
    back_slots: Optional[List[Dict[str, Any]]] = None
    required_uploads: Optional[List[str]] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None

# --- Mockup & Blending Parameters ---
class MockupParams(BaseModel):
    blend_strength: float = 80.0
    print_opacity: float = 100.0
    fabric_deformation: float = 25.0
    fabric_texture: float = 40.0
    shading_strength: float = 50.0
    blend_mode: str = "auto" # auto, normal, multiply, overlay, soft_light, darken, screen

# --- Design Generator ---
class SlotTransform(BaseModel):
    offset_x: float = 0.0
    offset_y: float = 0.0
    scale_multiplier: float = 1.0
    rotation: float = 0.0
    fit_mode: Optional[str] = "contain"

class GenerateDesignRequest(BaseModel):
    color: str = "Black"
    style: str = "Oversized"
    pattern_id: str
    front_artwork_id: Optional[str] = None
    back_artwork_id: Optional[str] = None
    transforms: Dict[str, SlotTransform] = Field(default_factory=dict)
    include_labels: bool = False
    generate_mockup: bool = True
    mockup_params: Optional[MockupParams] = None

class PreviewDesignRequest(BaseModel):
    color: str
    style: str
    side: str
    pattern_id: str
    artwork_filename: Optional[str] = None
    transform: Optional[SlotTransform] = None

class Preview2x2Request(BaseModel):
    pattern_id: str
    front_artwork_id: Optional[str] = None
    back_artwork_id: Optional[str] = None
    transforms: Dict[str, SlotTransform] = Field(default_factory=dict)
    include_labels: bool = False
    mode: str = "flat" # "flat" | "realistic"
    mockup_params: Optional[MockupParams] = None

class DesignJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    job_code: str
    filename: Optional[str] = None
    garment_color: str
    garment_style: str
    pattern_id: str
    pattern_name: Optional[str]
    status: str
    error_message: Optional[str] = None
    output_psd_path: Optional[str] = None
    output_png_path: Optional[str] = None
    output_mockup_png_path: Optional[str] = None
    preview_png_path: Optional[str] = None
    png_url: Optional[str] = None
    mockup_png_url: Optional[str] = None
    download_url: Optional[str] = None
    mockup_download_url: Optional[str] = None
    file_size_bytes: int = 0
    width: int = 5400
    height: int = 5286
    canvas_width: int = 5400
    canvas_height: int = 5286
    format: str = "PNG"
    color_mode: str = "RGBA"
    views: List[str] = ["black_front", "black_back", "white_front", "white_back"]
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
