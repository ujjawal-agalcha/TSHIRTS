import axios from 'axios';
import {
  Template,
  TemplateCategory,
  Pattern,
  DesignJob,
  InventoryItem,
  Supplier,
  AnalyticsData,
  ArtworkUploadResult,
  PrintZone,
  SlotTransform,
  BlendPreviewResult,
  BlendExportResult,
  TemplateAsset
} from '../types';

const api = axios.create({
  baseURL: '/api',
});

export const ApiService = {
  // Health
  getHealth: async () => {
    const res = await api.get('/health');
    return res.data;
  },

  // ─── Templates & Zones (Generic Apparel) ─────────────────────────────────
  getTemplates: async (params?: {
    q?: string;
    category?: string;
    color?: string;
    style?: string;
    status?: string;
    include_inactive?: boolean;
    sort_by?: string;
  }): Promise<Template[]> => {
    const res = await api.get('/templates', { params });
    return res.data;
  },

  getTemplate: async (id: number): Promise<Template> => {
    const res = await api.get(`/templates/${id}`);
    return res.data;
  },

  createTemplate: async (formData: FormData): Promise<Template> => {
    const res = await api.post('/templates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  updateTemplate: async (id: number, data: Partial<Template>): Promise<Template> => {
    const res = await api.put(`/templates/${id}`, data);
    return res.data;
  },

  duplicateTemplate: async (id: number, newName?: string): Promise<Template> => {
    const res = await api.post(`/templates/${id}/duplicate`, null, {
      params: newName ? { new_name: newName } : undefined,
    });
    return res.data;
  },

  toggleTemplate: async (id: number): Promise<Template> => {
    const res = await api.patch(`/templates/${id}/toggle`);
    return res.data;
  },

  deleteTemplate: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete(`/templates/${id}`);
    return res.data;
  },

  uploadTemplateAsset: async (templateId: number, view: string, file: File): Promise<TemplateAsset> => {
    const formData = new FormData();
    formData.append('view', view);
    formData.append('file', file);
    const res = await api.post(`/templates/${templateId}/assets`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Categories
  getCategories: async (): Promise<TemplateCategory[]> => {
    const res = await api.get('/templates/categories');
    return res.data;
  },

  addCategory: async (name: string, description?: string): Promise<TemplateCategory> => {
    const res = await api.post('/templates/categories', { name, description });
    return res.data;
  },

  // Zone Management
  getZones: async (templateId: number): Promise<PrintZone[]> => {
    const res = await api.get(`/templates/${templateId}/zones`);
    return res.data;
  },

  addZone: async (templateId: number, data: Partial<PrintZone>): Promise<PrintZone> => {
    const res = await api.post(`/templates/${templateId}/zones`, data);
    return res.data;
  },

  updateZone: async (templateId: number, zoneId: number, data: Partial<PrintZone>): Promise<PrintZone> => {
    const res = await api.put(`/templates/${templateId}/zones/${zoneId}`, data);
    return res.data;
  },

  deleteZone: async (templateId: number, zoneId: number): Promise<{ message: string }> => {
    const res = await api.delete(`/templates/${templateId}/zones/${zoneId}`);
    return res.data;
  },

  // ─── Patterns ──────────────────────────────────────────────────────────────
  getPatterns: async (include_inactive: boolean = false): Promise<Pattern[]> => {
    const res = await api.get('/patterns', { params: { include_inactive } });
    return res.data;
  },

  createPattern: async (patternData: Partial<Pattern>): Promise<Pattern> => {
    const res = await api.post('/patterns', patternData);
    return res.data;
  },

  updatePattern: async (patternId: string, data: Partial<Pattern>): Promise<Pattern> => {
    const res = await api.put(`/patterns/${patternId}`, data);
    return res.data;
  },

  togglePattern: async (patternId: string): Promise<Pattern> => {
    const res = await api.patch(`/patterns/${patternId}/toggle`);
    return res.data;
  },

  duplicatePattern: async (patternId: string): Promise<Pattern> => {
    const res = await api.post(`/patterns/${patternId}/duplicate`);
    return res.data;
  },

  deletePattern: async (patternId: string): Promise<{ message: string }> => {
    const res = await api.delete(`/patterns/${patternId}`);
    return res.data;
  },

  restoreDefaultPatterns: async (): Promise<Pattern[]> => {
    const res = await api.post('/patterns/restore-defaults');
    return res.data;
  },

  // ─── Design Generator & Uploads ────────────────────────────────────────────
  uploadArtwork: async (file: File): Promise<ArtworkUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/design/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getPreview: async (payload: {
    color: string;
    style: string;
    side: string;
    pattern_id: string;
    artwork_filename?: string;
    transform?: SlotTransform;
  }): Promise<{ preview_url: string }> => {
    const res = await api.post('/design/preview', payload);
    return res.data;
  },

  generatePng: async (payload: {
    color?: string;
    style?: string;
    pattern_id: string;
    front_artwork_id?: string;
    back_artwork_id?: string;
    transforms: Record<string, SlotTransform>;
    include_labels?: boolean;
    generate_mockup?: boolean;
    mockup_params?: any;
  }): Promise<DesignJob> => {
    const res = await api.post('/design/generate', payload);
    return res.data;
  },

  generatePsd: async (payload: {
    color?: string;
    style?: string;
    pattern_id: string;
    front_artwork_id?: string;
    back_artwork_id?: string;
    transforms: Record<string, SlotTransform>;
    include_labels?: boolean;
  }): Promise<DesignJob> => {
    const res = await api.post('/design/generate', payload);
    return res.data;
  },

  get2x2Preview: async (payload: {
    pattern_id: string;
    front_artwork_id?: string;
    back_artwork_id?: string;
    transforms: Record<string, SlotTransform>;
    include_labels?: boolean;
    mode?: 'flat' | 'realistic';
    mockup_params?: any;
  }): Promise<{ preview_url: string }> => {
    const res = await api.post('/design/preview-2x2', payload);
    return res.data;
  },

  getDesignJobs: async (): Promise<DesignJob[]> => {
    const res = await api.get('/design-jobs');
    return res.data;
  },

  // ─── Design Blending ───────────────────────────────────────────────────────
  blendPreview: async (
    backgroundFile: File,
    artworkFile: File,
    params: {
      x?: number;
      y?: number;
      target_width?: number;
      target_height?: number;
      scale?: number;
      rotation?: number;
      blend_mode?: string;
      blend_strength?: number;
      opacity?: number;
    }
  ): Promise<BlendPreviewResult> => {
    const formData = new FormData();
    formData.append('background', backgroundFile);
    formData.append('artwork', artworkFile);
    const res = await api.post('/design/blend/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params,
    });
    return res.data;
  },

  blendPreviewUpdate: async (params: {
    background_id: string;
    artwork_id: string;
    x?: number;
    y?: number;
    target_width?: number;
    target_height?: number;
    scale?: number;
    rotation?: number;
    blend_mode?: string;
    blend_strength?: number;
    opacity?: number;
  }): Promise<BlendPreviewResult> => {
    const res = await api.post('/design/blend/preview-update', null, { params });
    return res.data;
  },

  blendExport: async (
    backgroundFile: File,
    artworkFile: File,
    params: {
      x?: number;
      y?: number;
      target_width?: number;
      target_height?: number;
      scale?: number;
      rotation?: number;
      blend_mode?: string;
      blend_strength?: number;
      opacity?: number;
    }
  ): Promise<BlendExportResult> => {
    const formData = new FormData();
    formData.append('background', backgroundFile);
    formData.append('artwork', artworkFile);
    const res = await api.post('/design/blend', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params,
    });
    return res.data;
  },

  blendSendToGenerator: async (
    backgroundFile: File,
    artworkFile: File,
    params: {
      x?: number;
      y?: number;
      target_width?: number;
      target_height?: number;
      scale?: number;
      rotation?: number;
      blend_mode?: string;
      blend_strength?: number;
      opacity?: number;
    }
  ): Promise<ArtworkUploadResult> => {
    const formData = new FormData();
    formData.append('background', backgroundFile);
    formData.append('artwork', artworkFile);
    const res = await api.post('/design/blend/send-to-generator', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params,
    });
    return res.data;
  },

  // ─── Inventory ─────────────────────────────────────────────────────────────
  getInventory: async (params?: { q?: string; color?: string; style?: string; low_stock?: boolean }): Promise<InventoryItem[]> => {
    const res = await api.get('/inventory', { params });
    return res.data;
  },

  adjustStock: async (itemId: number, delta: number): Promise<InventoryItem> => {
    const res = await api.patch(`/inventory/${itemId}/stock`, { delta });
    return res.data;
  },

  createInventoryItem: async (item: Partial<InventoryItem>): Promise<InventoryItem> => {
    const res = await api.post('/inventory', item);
    return res.data;
  },

  getSuppliers: async (): Promise<Supplier[]> => {
    const res = await api.get('/inventory/suppliers');
    return res.data;
  },

  // ─── Analytics ─────────────────────────────────────────────────────────────
  getAnalytics: async (): Promise<AnalyticsData> => {
    const res = await api.get('/analytics');
    return res.data;
  },

  // ─── Master Data ───────────────────────────────────────────────────────────
  getMasterData: async () => {
    const res = await api.get('/master-data/summary');
    return res.data;
  },

  // ─── AI Assistant ──────────────────────────────────────────────────────────
  chat: async (message: string, history: any[] = []) => {
    const res = await api.post('/ai/chat', { message, history });
    return res.data;
  },
};
