import axios from 'axios';
import {
  Template,
  Pattern,
  DesignJob,
  InventoryItem,
  Supplier,
  AnalyticsData,
  ArtworkUploadResult,
  PrintZone,
  SlotTransform
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

  // Templates & Zones
  getTemplates: async (): Promise<Template[]> => {
    const res = await api.get('/templates');
    return res.data;
  },

  updateZone: async (templateId: number, zoneId: number, data: Partial<PrintZone>): Promise<PrintZone> => {
    const res = await api.put(`/templates/${templateId}/zones/${zoneId}`, data);
    return res.data;
  },

  // Patterns
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

  // Design Generator & Uploads
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

  // Inventory
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

  // Analytics
  getAnalytics: async (): Promise<AnalyticsData> => {
    const res = await api.get('/analytics');
    return res.data;
  },

  // Master Data
  getMasterData: async () => {
    const res = await api.get('/master-data/summary');
    return res.data;
  },

  // AI Assistant
  chat: async (message: string, history: any[] = []) => {
    const res = await api.post('/ai/chat', { message, history });
    return res.data;
  },
};
