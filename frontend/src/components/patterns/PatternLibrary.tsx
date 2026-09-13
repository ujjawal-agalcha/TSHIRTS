import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  ArrowRight, 
  Copy, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Check, 
  X, 
  AlertCircle
} from 'lucide-react';
import { ApiService } from '../../services/api';
import { Pattern } from '../../types';

interface PatternLibraryProps {
  onSelectPatternForDesign: (patternId: string) => void;
}

const DEFAULT_PATTERN_IDS = [
  'front_left_chest',
  'front_center_small',
  'front_center_large',
  'front_full',
  'back_center',
  'back_full',
  'small_front_full_back',
  'front_center_back_full',
  'front_full_back_full',
  'front_small_back_center',
  'front_typography_back_graphic',
  'back_only',
  'front_only',
  'small_logo_front_large_graphic_back',
  'custom_front_custom_back'
];

const AVAILABLE_ZONES = [
  { code: 'NONE', label: 'None / Blank', side: 'none' },
  { code: 'LEFT_CHEST', label: 'Front Left Chest (440×440px)', side: 'front' },
  { code: 'CENTER_CHEST', label: 'Front Center Chest (800×650px)', side: 'front' },
  { code: 'UPPER_CENTER', label: 'Front Upper Center (900×450px)', side: 'front' },
  { code: 'FULL_FRONT', label: 'Full Front Graphic (970×1451px)', side: 'front' },
  { code: 'FRONT_CUSTOM', label: 'Front Custom Zone (1100×1500px)', side: 'front' },
  { code: 'BACK_CENTER', label: 'Back Center Graphic (1000×1300px)', side: 'back' },
  { code: 'FULL_BACK', label: 'Full Back Graphic (1200×1650px)', side: 'back' },
  { code: 'BACK_NECK_LOGO', label: 'Back Neck Logo (400×250px)', side: 'back' },
  { code: 'BACK_CUSTOM', label: 'Back Custom Zone (1300×1700px)', side: 'back' },
];

export const PatternLibrary: React.FC<PatternLibraryProps> = ({ onSelectPatternForDesign }) => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [includeInactive, setIncludeInactive] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal states for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingPatternId, setEditingPatternId] = useState<string | null>(null);

  // Modal form fields
  const [formPatternId, setFormPatternId] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Standard');
  const [formFrontZone, setFormFrontZone] = useState<string>('LEFT_CHEST');
  const [formBackZone, setFormBackZone] = useState<string>('FULL_BACK');

  useEffect(() => {
    loadPatterns();
  }, [includeInactive]);

  const loadPatterns = async () => {
    try {
      const data = await ApiService.getPatterns(includeInactive);
      setPatterns(data);
    } catch (err: any) {
      console.error('Failed to load patterns:', err);
    }
  };

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const categories = ['All', 'Dual-Print', 'Front-Only', 'Back-Only', 'Custom'];

  const filteredPatterns = patterns.filter(p => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.pattern_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Toggle active/inactive
  const handleToggleActive = async (patternId: string) => {
    try {
      const updated = await ApiService.togglePattern(patternId);
      setPatterns(prev => prev.map(p => p.pattern_id === patternId ? updated : p));
      notify(`Pattern '${updated.name}' is now ${updated.is_active ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to toggle pattern status.');
    }
  };

  // Duplicate pattern
  const handleDuplicate = async (patternId: string) => {
    try {
      const newPattern = await ApiService.duplicatePattern(patternId);
      setPatterns(prev => [...prev, newPattern]);
      notify(`Pattern duplicated as '${newPattern.name}'.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to duplicate pattern.');
    }
  };

  // Delete user-created pattern
  const handleDelete = async (patternId: string, patternName: string) => {
    if (!window.confirm(`Are you sure you want to delete pattern '${patternName}'?`)) return;
    try {
      await ApiService.deletePattern(patternId);
      setPatterns(prev => prev.filter(p => p.pattern_id !== patternId));
      notify(`Pattern '${patternName}' deleted.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Cannot delete default pattern.');
    }
  };

  // Restore defaults
  const handleRestoreDefaults = async () => {
    if (!window.confirm('Restore any missing default patterns? Your custom patterns will remain untouched.')) return;
    try {
      const refreshed = await ApiService.restoreDefaultPatterns();
      setPatterns(refreshed);
      notify('Default patterns restored successfully.');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to restore default patterns.');
    }
  };

  // Open modal for Create
  const openCreateModal = () => {
    setModalMode('create');
    setEditingPatternId(null);
    setFormPatternId(`custom_pattern_${Date.now().toString().slice(-4)}`);
    setFormName('');
    setFormDescription('');
    setFormCategory('Custom');
    setFormFrontZone('LEFT_CHEST');
    setFormBackZone('FULL_BACK');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const openEditModal = (p: Pattern) => {
    setModalMode('edit');
    setEditingPatternId(p.pattern_id);
    setFormPatternId(p.pattern_id);
    setFormName(p.name);
    setFormDescription(p.description || '');
    setFormCategory(p.category || 'Standard');
    
    const fz = p.front_slots.length > 0 ? p.front_slots[0].zone_code : 'NONE';
    const bz = p.back_slots.length > 0 ? p.back_slots[0].zone_code : 'NONE';
    setFormFrontZone(fz);
    setFormBackZone(bz);

    setIsModalOpen(true);
  };

  // Save Modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const frontSlots = formFrontZone !== 'NONE' ? [{
      slot: 'front',
      zone_code: formFrontZone,
      label: AVAILABLE_ZONES.find(z => z.code === formFrontZone)?.label.split('(')[0].trim() || 'Front Artwork',
      required: true
    }] : [];

    const backSlots = formBackZone !== 'NONE' ? [{
      slot: 'back',
      zone_code: formBackZone,
      label: AVAILABLE_ZONES.find(z => z.code === formBackZone)?.label.split('(')[0].trim() || 'Back Artwork',
      required: true
    }] : [];

    const requiredUploads = [];
    if (frontSlots.length > 0) requiredUploads.push('front');
    if (backSlots.length > 0) requiredUploads.push('back');

    const previewBadge = requiredUploads.length === 2 ? 'Front + Back' : requiredUploads.includes('front') ? 'Front Only' : requiredUploads.includes('back') ? 'Back Only' : 'Custom';

    try {
      if (modalMode === 'create') {
        const created = await ApiService.createPattern({
          pattern_id: formPatternId.trim().toLowerCase().replace(/\s+/g, '_'),
          name: formName.trim(),
          description: formDescription.trim(),
          category: formCategory,
          preview_badge: previewBadge,
          front_slots: frontSlots,
          back_slots: backSlots,
          required_uploads: requiredUploads,
          is_active: true
        });
        setPatterns(prev => [...prev, created]);
        notify(`Pattern '${created.name}' created successfully.`);
      } else if (editingPatternId) {
        const updated = await ApiService.updatePattern(editingPatternId, {
          name: formName.trim(),
          description: formDescription.trim(),
          category: formCategory,
          preview_badge: previewBadge,
          front_slots: frontSlots,
          back_slots: backSlots,
          required_uploads: requiredUploads
        });
        setPatterns(prev => prev.map(p => p.pattern_id === editingPatternId ? updated : p));
        notify(`Pattern '${updated.name}' updated successfully.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to save pattern.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <span>Pattern Library</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
              {patterns.length} Patterns
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Browse, manage, configure print zones, duplicate, and toggle print pattern presets.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="px-3 py-1.5 rounded-lg bg-[#141b2b] hover:bg-[#1a2338] text-slate-300 hover:text-white border border-[#1e293d] text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Defaults</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Custom Pattern</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="ml-auto text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#121927] border border-[#1e293d] rounded-xl p-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white bg-[#0e1422]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <label className="flex items-center space-x-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="w-3.5 h-3.5 accent-blue-500 rounded"
            />
            <span>Show Inactive</span>
          </label>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search patterns or zones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Patterns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatterns.map((p) => {
          const isDefault = DEFAULT_PATTERN_IDS.includes(p.pattern_id);
          const uploadsCount = p.required_uploads.length;

          return (
            <div
              key={p.pattern_id}
              className={`bg-[#121927] border rounded-xl p-4 flex flex-col justify-between transition-all group ${
                p.is_active ? 'border-[#1e293d] hover:border-slate-700' : 'border-slate-800/60 opacity-60'
              }`}
            >
              <div className="space-y-3">
                {/* Header tags */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                      {p.category}
                    </span>
                    {isDefault && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Active toggle button */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(p.pattern_id)}
                      title={p.is_active ? 'Click to disable' : 'Click to enable'}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                        p.is_active
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/25'
                      }`}
                    >
                      {p.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                </div>

                {/* Print Zone Details */}
                <div className="bg-[#0e1422] rounded-lg p-2.5 space-y-1.5 text-[11px] border border-[#1e293d]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Front Zone:</span>
                    {p.front_slots.length > 0 ? (
                      <span className="font-mono text-blue-400">{p.front_slots[0].label || p.front_slots[0].zone_code}</span>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Back Zone:</span>
                    {p.back_slots.length > 0 ? (
                      <span className="font-mono text-indigo-400">{p.back_slots[0].label || p.back_slots[0].zone_code}</span>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="mt-4 pt-3 border-t border-[#1e293d]/60 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(p)}
                    title="Edit Pattern Settings"
                    className="p-1.5 rounded-lg bg-[#0e1422] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-[#1e293d] transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicate(p.pattern_id)}
                    title="Duplicate as Custom Pattern"
                    className="p-1.5 rounded-lg bg-[#0e1422] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-[#1e293d] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => handleDelete(p.pattern_id, p.name)}
                      title="Delete Custom Pattern"
                      className="p-1.5 rounded-lg bg-[#0e1422] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[#1e293d] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPatternForDesign(p.pattern_id)}
                  className="py-1.5 px-3 rounded-lg bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 hover:border-transparent text-xs font-semibold flex items-center space-x-1.5 transition-all"
                >
                  <span>Use Pattern</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT PATTERN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121927] border border-[#1e293d] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293d]">
              <h3 className="text-base font-bold text-white">
                {modalMode === 'create' ? 'Create Custom Pattern' : `Edit Pattern: ${formName}`}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              {modalMode === 'create' && (
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Pattern Identifier (ID)</label>
                  <input
                    type="text"
                    required
                    value={formPatternId}
                    onChange={(e) => setFormPatternId(e.target.value)}
                    className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg p-2 text-white font-mono"
                    placeholder="e.g. custom_my_brand_front"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Pattern Display Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg p-2 text-white text-sm"
                  placeholder="e.g. Vintage Heart Front + Poster Back"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg p-2 text-white"
                  placeholder="Short description of this placement configuration..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg p-2 text-white"
                  >
                    <option value="Dual-Print">Dual-Print</option>
                    <option value="Front-Only">Front-Only</option>
                    <option value="Back-Only">Back-Only</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Front Print Zone</label>
                  <select
                    value={formFrontZone}
                    onChange={(e) => setFormFrontZone(e.target.value)}
                    className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg p-2 text-white"
                  >
                    {AVAILABLE_ZONES.filter(z => z.side === 'front' || z.side === 'none').map(z => (
                      <option key={z.code} value={z.code}>{z.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Back Print Zone</label>
                <select
                  value={formBackZone}
                  onChange={(e) => setFormBackZone(e.target.value)}
                  className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg p-2 text-white"
                >
                  {AVAILABLE_ZONES.filter(z => z.side === 'back' || z.side === 'none').map(z => (
                    <option key={z.code} value={z.code}>{z.label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#1e293d]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#0e1422] hover:bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
                >
                  {modalMode === 'create' ? 'Create Pattern' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
