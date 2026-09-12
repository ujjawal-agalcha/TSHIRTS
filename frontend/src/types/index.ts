export interface PrintZone {
  id: number;
  template_id: number;
  side: 'front' | 'back';
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

export interface Template {
  id: number;
  name: string;
  code: string;
  canvas_width: number;
  canvas_height: number;
  preview_front_black: string;
  preview_front_white: string;
  preview_back_black: string;
  preview_back_white: string;
  zones: PrintZone[];
}

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

export interface SlotTransform {
  offset_x: number;
  offset_y: number;
  scale_multiplier: number;
  rotation: number;
  fit_mode?: string;
}

export interface ArtworkUploadResult {
  artwork_id: string;
  original_name: string;
  url: string;
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
  garment_color: string;
  garment_style: string;
  pattern_id: string;
  pattern_name: string;
  status: string;
  error_message?: string;
  output_psd_path?: string;
  preview_png_path?: string;
  file_size_bytes: number;
  download_url?: string;
  created_at: string;
}

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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggested_actions?: string[];
}
