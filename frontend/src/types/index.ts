// ─── Print Zone (with extensible view field) ─────────────────────────────────
export interface PrintZone {
  id: number;
  template_id: number;
  side: 'front' | 'back';
  view: string; // extensible: front, back, sleeve_left, hood, pocket, custom, etc.
  zone_code: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  fit_mode: string;
  safe_margin: number;
  is_active: boolean;
}

// ─── Template Asset (per-view image file) ────────────────────────────────────
export interface TemplateAsset {
  id: number;
  template_id: number;
  view: string;
  file_path: string;
  width: number;
  height: number;
}

// ─── Generic Apparel Template ────────────────────────────────────────────────
export interface Template {
  id: number;
  name: string;
  code: string;
  category: string;  // T-Shirt, Hoodie, Track Pant, Sweatshirt, etc.
  color: string;     // Black, White, Grey, etc.
  style: string;     // Oversized, Regular, Relaxed, etc.
  description?: string;
  status: string;    // active, inactive
  canvas_width: number;
  canvas_height: number;
  preview_front_black: string;
  preview_front_white: string;
  preview_back_black: string;
  preview_back_white: string;
  is_active: boolean;
  assets: TemplateAsset[];
  zones: PrintZone[];
}

// ─── Template Category ───────────────────────────────────────────────────────
export interface TemplateCategory {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
}

// ─── Pattern ─────────────────────────────────────────────────────────────────
export interface SlotDef {
  slot: string;
  zone_code: string;
  label: string;
  required: boolean;
}

export interface Pattern {
  id: number;
  pattern_id: string;
  name: string;
  description: string;
  category: string;
  preview_badge: string;
  front_slots: SlotDef[];
  back_slots: SlotDef[];
  required_uploads: string[];
  is_active: boolean;
  sort_order: number;
}

// ─── Design Generator ────────────────────────────────────────────────────────
export interface SlotTransform {
  offset_x: number;
  offset_y: number;
  scale_multiplier: number;
  rotation: number;
  fit_mode?: string;
}

export interface MockupParams {
  blend_strength: number;
  print_opacity: number;
  fabric_deformation: number;
  fabric_texture: number;
  shading_strength: number;
  blend_mode: string;
}

export interface ArtworkUploadResult {
  artwork_id: string;
  original_name: string;
  url: string;
  source?: string; // 'design_blending' when sent from blending tool
  inspection: {
    width: number;
    height: number;
    format: string;
    has_transparency: boolean;
    aspect_ratio: number;
    is_high_res: boolean;
    print_size_300dpi_inches: [number, number];
  };
}

export interface DesignJob {
  id: number;
  job_code: string;
  filename?: string;
  garment_color: string;
  garment_style: string;
  pattern_id: string;
  pattern_name: string;
  status: string;
  error_message?: string;
  output_psd_path?: string;
  output_png_path?: string;
  output_mockup_png_path?: string;
  preview_png_path?: string;
  png_url?: string;
  mockup_png_url?: string;
  file_size_bytes: number;
  download_url?: string;
  mockup_download_url?: string;
  width?: number;
  height?: number;
  format?: string;
  color_mode?: string;
  views?: string[];
  created_at: string;
}

// ─── Design Blending ─────────────────────────────────────────────────────────
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft_light'
  | 'hard_light'
  | 'darken'
  | 'lighten'
  | 'color_burn'
  | 'color_dodge'
  | 'color';

export interface BlendParams {
  x: number;
  y: number;
  target_width: number | null;
  target_height: number | null;
  scale: number;
  rotation: number;
  blend_mode: BlendMode;
  blend_strength: number;
  opacity: number;
}

export interface BlendPreviewResult {
  preview_url: string;
  analysis: {
    luminance: number;
    std_deviation: number;
    classification: 'LIGHT' | 'DARK' | 'MIXED';
    recommended_mode: string;
    explanation: string;
  };
  background_id?: string;
  artwork_id?: string;
  background_size?: { width: number; height: number };
  artwork_size?: { width: number; height: number };
}

export interface BlendExportResult {
  output_url: string;
  download_url: string;
  width: number;
  height: number;
  file_size_bytes: number;
}

// ─── Inventory ───────────────────────────────────────────────────────────────
export interface InventoryItem {
  id: number;
  sku: string;
  product_name: string;
  color: string;
  style: string;
  size: string;
  stock_quantity: number;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
  supplier_id?: number;
  supplier_name?: string;
  is_active: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  lead_time_days: number;
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export interface AnalyticsData {
  total_designs: number;
  total_psd_generated: number;
  most_used_color: string;
  most_used_style: string;
  most_used_pattern: string;
  total_inventory_units: number;
  low_stock_items_count: number;
  pattern_distribution: { name: string; count: number }[];
  color_distribution: { name: string; count: number }[];
  recent_jobs: {
    id: number;
    job_code: string;
    color: string;
    style: string;
    pattern_name: string;
    status: string;
    file_size_mb: number;
    created_at: string;
    download_url: string;
  }[];
}

// ─── AI Assistant ────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggested_actions?: string[];
}
