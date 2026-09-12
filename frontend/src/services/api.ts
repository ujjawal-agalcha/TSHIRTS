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
  getPatterns: async (): Promise<Pattern[]> => {
    const res = await api.get('/patterns');
    return res.data;
  },

  createPattern: async (patternData: Partial<Pattern>): Promise<Pattern> => {
    const res = await api.post('/patterns', patternData);
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

  generatePsd: async (payload: {
    color: string;
    style: string;
    pattern_id: string;
    front_artwork_id?: string;
    back_artwork_id?: string;
    transforms: Record<string, SlotTransform>;
  }): Promise<DesignJob> => {
    const res = await api.post('/design/generate', payload);
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
