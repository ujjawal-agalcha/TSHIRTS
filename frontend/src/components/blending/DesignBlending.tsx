import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Download,
  Send,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Layers,
  Sun,
  Moon,
  Blend,
  Sliders,
  RefreshCw,
  Loader2,
  ChevronDown,
  Info,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { ApiService } from '../../services/api';
import { BlendMode, BlendPreviewResult } from '../../types';

interface DesignBlendingProps {
  onSendToGenerator?: (artworkId: string) => void;
}

const BLEND_MODES: { value: BlendMode; label: string; description: string }[] = [
  { value: 'normal', label: 'Normal', description: 'Standard alpha compositing' },
  { value: 'multiply', label: 'Multiply', description: 'Darkens — ideal for dark art on light backgrounds' },
  { value: 'screen', label: 'Screen', description: 'Lightens — ideal for light art on dark backgrounds' },
  { value: 'overlay', label: 'Overlay', description: 'Increases contrast, combines Multiply & Screen' },
  { value: 'soft_light', label: 'Soft Light', description: 'Subtle contrast enhancement' },
  { value: 'hard_light', label: 'Hard Light', description: 'Intense contrast enhancement' },
  { value: 'darken', label: 'Darken', description: 'Keeps darkest pixels from both layers' },
  { value: 'lighten', label: 'Lighten', description: 'Keeps lightest pixels from both layers' },
  { value: 'color_burn', label: 'Color Burn', description: 'Deepens shadows by darkening base colors' },
  { value: 'color_dodge', label: 'Color Dodge', description: 'Brightens highlights by lightening base colors' },
  { value: 'color', label: 'Color', description: 'Applies hue & saturation of artwork with base luminosity' },
];

export const DesignBlending: React.FC<DesignBlendingProps> = ({ onSendToGenerator }) => {
  // Files
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string>('');
  const [artworkPreview, setArtworkPreview] = useState<string>('');

  // Server IDs for fast re-previewing
  const [backgroundId, setBackgroundId] = useState<string>('');
  const [artworkId, setArtworkId] = useState<string>('');

  // Dimensions
  const [bgSize, setBgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [artSize, setArtSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Blend parameters
  const [blendMode, setBlendMode] = useState<BlendMode>('normal');
  const [blendStrength, setBlendStrength] = useState(100);
  const [opacity, setOpacity] = useState(100);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [targetWidth, setTargetWidth] = useState<number>(0);
  const [targetHeight, setTargetHeight] = useState<number>(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1.0);

  // Preview
  const [previewUrl, setPreviewUrl] = useState('');
  const [analysis, setAnalysis] = useState<BlendPreviewResult['analysis'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  // Export
  const [isExporting, setIsExporting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [exportResult, setExportResult] = useState<{ url: string; width: number; height: number; size: number } | null>(null);

  const bgInputRef = useRef<HTMLInputElement>(null);
  const artInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle background upload
  const handleBackgroundUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackgroundFile(file);
    setBackgroundId('');

    const reader = new FileReader();
    reader.onload = () => setBackgroundPreview(reader.result as string);
    reader.readAsDataURL(file);

    const img = new window.Image();
    img.onload = () => {
      setBgSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = URL.createObjectURL(file);
  }, []);

  // Handle artwork upload
  const handleArtworkUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArtworkFile(file);
    setArtworkId('');

    const reader = new FileReader();
    reader.onload = () => setArtworkPreview(reader.result as string);
    reader.readAsDataURL(file);

    const img = new window.Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setArtSize({ width: w, height: h });
      setTargetWidth(w);
      setTargetHeight(h);
      setAspectRatio(w / h);
    };
    img.src = URL.createObjectURL(file);
  }, []);

  // Width change with aspect lock
  const handleWidthChange = (newWidth: number) => {
    setTargetWidth(newWidth);
    if (aspectLocked && aspectRatio > 0) {
      setTargetHeight(Math.round(newWidth / aspectRatio));
    }
  };

  const handleHeightChange = (newHeight: number) => {
    setTargetHeight(newHeight);
    if (aspectLocked && aspectRatio > 0) {
      setTargetWidth(Math.round(newHeight * aspectRatio));
    }
  };

  // Generate preview
  const generatePreview = useCallback(async () => {
    if (!backgroundFile || !artworkFile) return;
    setIsLoading(true);

    try {
      let result: BlendPreviewResult;
      if (backgroundId && artworkId) {
        result = await ApiService.blendPreviewUpdate({
          background_id: backgroundId,
          artwork_id: artworkId,
          x: posX,
          y: posY,
          target_width: targetWidth || undefined,
          target_height: targetHeight || undefined,
          scale,
          rotation,
          blend_mode: blendMode,
          blend_strength: blendStrength,
          opacity,
        });
      } else {
        result = await ApiService.blendPreview(backgroundFile, artworkFile, {
          x: posX,
          y: posY,
          target_width: targetWidth || undefined,
          target_height: targetHeight || undefined,
          scale,
          rotation,
          blend_mode: blendMode,
          blend_strength: blendStrength,
          opacity,
        });
        if (result.background_id) setBackgroundId(result.background_id);
        if (result.artwork_id) setArtworkId(result.artwork_id);
        if (result.background_size) setBgSize(result.background_size);
        if (result.artwork_size) setArtSize(result.artwork_size);
      }

      setPreviewUrl(result.preview_url + '?t=' + Date.now());
      setAnalysis(result.analysis);

      // Auto-apply recommended mode on first preview
      if (!previewUrl && result.analysis?.recommended_mode) {
        setBlendMode(result.analysis.recommended_mode as BlendMode);
      }
    } catch (err: any) {
      console.error('Preview failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [backgroundFile, artworkFile, backgroundId, artworkId, posX, posY, targetWidth, targetHeight, scale, rotation, blendMode, blendStrength, opacity, previewUrl]);

  // Export full resolution
  const handleExport = useCallback(async () => {
    if (!backgroundFile || !artworkFile) return;
    setIsExporting(true);
    try {
      const result = await ApiService.blendExport(backgroundFile, artworkFile, {
        x: posX,
        y: posY,
        target_width: targetWidth || undefined,
        target_height: targetHeight || undefined,
        scale,
        rotation,
        blend_mode: blendMode,
        blend_strength: blendStrength,
        opacity,
      });
      setExportResult({
        url: result.download_url,
        width: result.width,
        height: result.height,
        size: result.file_size_bytes,
      });

      // Trigger download
      const a = document.createElement('a');
      a.href = result.download_url;
      a.download = `blended_${Date.now()}.png`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [backgroundFile, artworkFile, posX, posY, targetWidth, targetHeight, scale, rotation, blendMode, blendStrength, opacity]);

  // Send to generator
  const handleSendToGenerator = useCallback(async () => {
    if (!backgroundFile || !artworkFile) return;
    setIsSending(true);
    try {
      const result = await ApiService.blendSendToGenerator(backgroundFile, artworkFile, {
        x: posX,
        y: posY,
        target_width: targetWidth || undefined,
        target_height: targetHeight || undefined,
        scale,
        rotation,
        blend_mode: blendMode,
        blend_strength: blendStrength,
        opacity,
      });
      if (onSendToGenerator && result.artwork_id) {
        onSendToGenerator(result.artwork_id);
      }
    } catch (err) {
      console.error('Send to generator failed:', err);
    } finally {
      setIsSending(false);
    }
  }, [backgroundFile, artworkFile, posX, posY, targetWidth, targetHeight, scale, rotation, blendMode, blendStrength, opacity, onSendToGenerator]);

  // Reset all
  const handleReset = () => {
    setBackgroundFile(null);
    setArtworkFile(null);
    setBackgroundPreview('');
    setArtworkPreview('');
    setBackgroundId('');
    setArtworkId('');
    setBgSize({ width: 0, height: 0 });
    setArtSize({ width: 0, height: 0 });
    setBlendMode('normal');
    setBlendStrength(100);
    setOpacity(100);
    setPosX(0);
    setPosY(0);
    setTargetWidth(0);
    setTargetHeight(0);
    setScale(1.0);
    setRotation(0);
    setAspectLocked(true);
    setPreviewUrl('');
    setAnalysis(null);
    setExportResult(null);
  };

  const classificationBadge = analysis ? (
    analysis.classification === 'LIGHT' ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
        <Sun className="w-3 h-3" /> LIGHT
      </span>
    ) : analysis.classification === 'DARK' ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
        <Moon className="w-3 h-3" /> DARK
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
        <Blend className="w-3 h-3" /> MIXED
      </span>
    )
  ) : null;

  return (
    <div className="h-full flex flex-col bg-[#0b0f17]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1e293d] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Design Blending Studio</h1>
            <p className="text-xs text-slate-400">Photoshop-style pixel blending with live preview</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysis && classificationBadge}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-[#162032] transition-all border border-[#1e293d]"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset All
          </button>
        </div>
      </div>

      {/* Main Layout: 3-column */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL — Upload & Presets */}
        <div className="w-72 border-r border-[#1e293d] bg-[#0e1422] overflow-y-auto p-4 space-y-4 shrink-0">
          <div className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase px-1">Source Images</div>

          {/* Background Upload */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Background / Garment</label>
            <input
              ref={bgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBackgroundUpload}
            />
            {backgroundPreview ? (
              <div
                className="relative group rounded-lg overflow-hidden border border-[#1e293d] cursor-pointer aspect-square"
                onClick={() => bgInputRef.current?.click()}
              >
                <img src={backgroundPreview} alt="Background" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-xs text-white font-medium">Change Image</span>
                </div>
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-slate-300 font-mono">
                  {bgSize.width}×{bgSize.height}
                </div>
              </div>
            ) : (
              <button
                onClick={() => bgInputRef.current?.click()}
                className="w-full aspect-square rounded-lg border-2 border-dashed border-[#2a3a52] hover:border-purple-500/50 transition-colors flex flex-col items-center justify-center gap-2 bg-[#121927] hover:bg-[#162032]"
              >
                <Upload className="w-6 h-6 text-slate-500" />
                <span className="text-xs text-slate-400">Upload Background</span>
              </button>
            )}
          </div>

          {/* Artwork Upload */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Artwork / Design</label>
            <input
              ref={artInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleArtworkUpload}
            />
            {artworkPreview ? (
              <div
                className="relative group rounded-lg overflow-hidden border border-[#1e293d] cursor-pointer aspect-square"
                onClick={() => artInputRef.current?.click()}
              >
                <img src={artworkPreview} alt="Artwork" className="w-full h-full object-contain bg-[#121927]" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-xs text-white font-medium">Change Artwork</span>
                </div>
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-slate-300 font-mono">
                  {artSize.width}×{artSize.height}
                </div>
              </div>
            ) : (
              <button
                onClick={() => artInputRef.current?.click()}
                className="w-full aspect-square rounded-lg border-2 border-dashed border-[#2a3a52] hover:border-pink-500/50 transition-colors flex flex-col items-center justify-center gap-2 bg-[#121927] hover:bg-[#162032]"
              >
                <ImageIcon className="w-6 h-6 text-slate-500" />
                <span className="text-xs text-slate-400">Upload Artwork</span>
              </button>
            )}
          </div>

          {/* Quick Presets */}
          {backgroundFile && artworkFile && (
            <div className="space-y-2 pt-2 border-t border-[#1e293d]">
              <div className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase px-1">Quick Presets</div>
              <button
                onClick={() => { setBlendMode('multiply'); setBlendStrength(100); setOpacity(100); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-[#121927] hover:bg-[#1a2538] border border-[#1e293d] transition-colors"
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" /> White Garment Preset
              </button>
              <button
                onClick={() => { setBlendMode('screen'); setBlendStrength(100); setOpacity(100); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-[#121927] hover:bg-[#1a2538] border border-[#1e293d] transition-colors"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" /> Black Garment Preset
              </button>
              <button
                onClick={() => { setBlendMode('overlay'); setBlendStrength(75); setOpacity(90); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-[#121927] hover:bg-[#1a2538] border border-[#1e293d] transition-colors"
              >
                <Blend className="w-3.5 h-3.5 text-emerald-400" /> Custom Blend
              </button>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-2 pt-2 border-t border-[#1e293d]">
              <div className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase px-1">Analysis</div>
              <div className="bg-[#121927] rounded-lg p-3 border border-[#1e293d] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Luminance</span>
                  <span className="text-slate-200 font-mono">{analysis.luminance}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Std Deviation</span>
                  <span className="text-slate-200 font-mono">{analysis.std_deviation}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Detected</span>
                  {classificationBadge}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Recommended</span>
                  <span className="text-purple-300 font-medium capitalize">{analysis.recommended_mode}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed pt-1 border-t border-[#1e293d]">
                  {analysis.explanation}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CENTER — Canvas / Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex items-center justify-center p-6 relative">
            {previewUrl && !showOriginal ? (
              <div className="relative max-w-full max-h-full">
                <img
                  src={previewUrl}
                  alt="Blend Preview"
                  className="max-w-full max-h-[calc(100vh-240px)] object-contain rounded-lg shadow-2xl shadow-black/50 border border-[#1e293d]"
                />
                {isLoading && (
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                )}
              </div>
            ) : backgroundPreview && showOriginal ? (
              <div className="relative max-w-full max-h-full">
                <img
                  src={backgroundPreview}
                  alt="Original"
                  className="max-w-full max-h-[calc(100vh-240px)] object-contain rounded-lg shadow-2xl shadow-black/50 border border-[#1e293d]"
                />
                <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 text-[10px] text-amber-300 font-semibold">
                  ORIGINAL (BEFORE)
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center mx-auto">
                  <Layers className="w-10 h-10 text-purple-400/60" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">Upload images and click Preview</p>
                  <p className="text-xs text-slate-500 mt-1">Background + Artwork → Pixel-perfect blend</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="px-6 py-3 border-t border-[#1e293d] bg-[#0e1422] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {previewUrl && (
                <button
                  onMouseDown={() => setShowOriginal(true)}
                  onMouseUp={() => setShowOriginal(false)}
                  onMouseLeave={() => setShowOriginal(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-[#121927] hover:bg-[#1a2538] border border-[#1e293d] transition-colors"
                >
                  {showOriginal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  Before / After
                </button>
              )}
              {bgSize.width > 0 && (
                <span className="text-[10px] text-slate-500 font-mono ml-2">
                  Canvas: {bgSize.width}×{bgSize.height}px
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={generatePreview}
                disabled={!backgroundFile || !artworkFile || isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                Preview
              </button>
              <button
                onClick={handleExport}
                disabled={!previewUrl || isExporting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Download PNG
              </button>
              <button
                onClick={handleSendToGenerator}
                disabled={!previewUrl || isSending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
              >
                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send to Generator
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — Controls */}
        <div className="w-80 border-l border-[#1e293d] bg-[#0e1422] overflow-y-auto p-4 space-y-4 shrink-0">
          <div className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase px-1">Blend Controls</div>

          {/* Blend Mode Selector */}
          <div className="space-y-1.5" ref={dropdownRef}>
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Blend className="w-3.5 h-3.5 text-purple-400" /> Blend Mode
              {analysis && (
                <button
                  onClick={() => setBlendMode(analysis.recommended_mode as BlendMode)}
                  className="ml-auto text-[10px] text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                >
                  Use Recommended
                </button>
              )}
            </label>
            <div className="relative">
              <button
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-[#121927] border border-[#1e293d] text-slate-200 hover:border-purple-500/50 transition-colors"
              >
                <span className="capitalize">{blendMode.replace('_', ' ')}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showModeDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showModeDropdown && (
                <div className="absolute z-20 top-full mt-1 w-full bg-[#121927] border border-[#1e293d] rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                  {BLEND_MODES.map(mode => (
                    <button
                      key={mode.value}
                      onClick={() => { setBlendMode(mode.value); setShowModeDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-[#1a2538] transition-colors ${
                        blendMode === mode.value ? 'bg-purple-600/20 text-purple-300' : 'text-slate-300'
                      }`}
                    >
                      <div className="font-medium">{mode.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{mode.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Blend Strength */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Blend Strength</label>
              <span className="text-xs text-slate-400 font-mono">{blendStrength}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={blendStrength}
              onChange={e => setBlendStrength(Number(e.target.value))}
              className="w-full accent-purple-500 h-1.5 rounded-full appearance-none bg-[#1e293d] cursor-pointer"
            />
          </div>

          {/* Opacity */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Artwork Opacity</label>
              <span className="text-xs text-slate-400 font-mono">{opacity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              className="w-full accent-pink-500 h-1.5 rounded-full appearance-none bg-[#1e293d] cursor-pointer"
            />
          </div>

          <div className="border-t border-[#1e293d] pt-3">
            <div className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase px-1 mb-3">Transform</div>

            {/* Dimensions with Aspect Lock */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Width (px)</label>
                  <input
                    type="number"
                    value={targetWidth}
                    onChange={e => handleWidthChange(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded bg-[#121927] border border-[#1e293d] text-xs text-slate-200 font-mono focus:border-purple-500/50 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setAspectLocked(!aspectLocked)}
                  className={`mt-4 p-1.5 rounded transition-colors ${aspectLocked ? 'text-purple-400 bg-purple-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {aspectLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Height (px)</label>
                  <input
                    type="number"
                    value={targetHeight}
                    onChange={e => handleHeightChange(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded bg-[#121927] border border-[#1e293d] text-xs text-slate-200 font-mono focus:border-purple-500/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Scale */}
            <div className="space-y-1.5 mt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Maximize2 className="w-3 h-3 text-slate-400" /> Scale
                </label>
                <span className="text-xs text-slate-400 font-mono">{Math.round(scale * 100)}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={300}
                value={Math.round(scale * 100)}
                onChange={e => setScale(Number(e.target.value) / 100)}
                className="w-full accent-blue-500 h-1.5 rounded-full appearance-none bg-[#1e293d] cursor-pointer"
              />
            </div>

            {/* Position */}
            <div className="flex gap-2 mt-3">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider">X (px)</label>
                <input
                  type="number"
                  value={posX}
                  onChange={e => setPosX(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded bg-[#121927] border border-[#1e293d] text-xs text-slate-200 font-mono focus:border-purple-500/50 focus:outline-none"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider">Y (px)</label>
                <input
                  type="number"
                  value={posY}
                  onChange={e => setPosY(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded bg-[#121927] border border-[#1e293d] text-xs text-slate-200 font-mono focus:border-purple-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Rotation */}
            <div className="space-y-1.5 mt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <RotateCcw className="w-3 h-3 text-slate-400" /> Rotation
                </label>
                <span className="text-xs text-slate-400 font-mono">{rotation}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                value={rotation}
                onChange={e => setRotation(Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 rounded-full appearance-none bg-[#1e293d] cursor-pointer"
              />
            </div>
          </div>

          {/* Export Info */}
          {exportResult && (
            <div className="border-t border-[#1e293d] pt-3 space-y-2">
              <div className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase px-1">Last Export</div>
              <div className="bg-[#121927] rounded-lg p-3 border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Resolution</span>
                  <span className="text-slate-200 font-mono">{exportResult.width}×{exportResult.height}px</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">File Size</span>
                  <span className="text-slate-200 font-mono">{(exportResult.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
