import React, { useState, useEffect, useCallback } from 'react';
import { 
  Check, 
  Upload, 
  Sparkles, 
  Download, 
  RotateCcw, 
  Sliders, 
  Eye, 
  Layers, 
  AlertCircle,
  FileImage,
  RefreshCw,
  Maximize2,
  Grid,
  Wand2,
  Palette
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ApiService } from '../../services/api';
import { Pattern, Template, SlotTransform, ArtworkUploadResult, DesignJob, MockupParams } from '../../types';

interface DesignGeneratorProps {
  initialPatternId?: string;
}

export const DesignGenerator: React.FC<DesignGeneratorProps> = ({ initialPatternId }) => {
  // Config state
  const [color, setColor] = useState<'White' | 'Black'>('Black');
  const [style, setStyle] = useState<'Regular' | 'Oversized'>('Oversized');
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedPatternId, setSelectedPatternId] = useState<string>(initialPatternId || 'small_front_full_back');
  const [templates, setTemplates] = useState<Template[]>([]);
  
  // Uploads
  const [frontArtwork, setFrontArtwork] = useState<ArtworkUploadResult | null>(null);
  const [backArtwork, setBackArtwork] = useState<ArtworkUploadResult | null>(null);
  const [isUploadingFront, setIsUploadingFront] = useState<boolean>(false);
  const [isUploadingBack, setIsUploadingBack] = useState<boolean>(false);

  // Preview & Transforms
  const [activeTuningTab, setActiveTuningTab] = useState<'front' | 'back'>('front');
  const [showBoundingBox, setShowBoundingBox] = useState<boolean>(true);
  const [includeLabels, setIncludeLabels] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'2x2' | 'single'>('2x2');
  const [focusedView, setFocusedView] = useState<'black_front' | 'black_back' | 'white_front' | 'white_back'>('black_front');

  // Preview Mode: Flat vs Realistic Mockup
  const [previewMode, setPreviewMode] = useState<'flat' | 'realistic'>('flat');
  const [backendPreviewUrl, setBackendPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  // Mockup Parameters
  const [mockupParams, setMockupParams] = useState<MockupParams>({
    blend_strength: 80,
    print_opacity: 100,
    fabric_deformation: 25,
    fabric_texture: 40,
    shading_strength: 50,
    blend_mode: 'auto'
  });

  const [frontTransform, setFrontTransform] = useState<SlotTransform>({
    offset_x: 0,
    offset_y: 0,
    scale_multiplier: 1.0,
    rotation: 0,
    fit_mode: 'contain'
  });
  const [backTransform, setBackTransform] = useState<SlotTransform>({
    offset_x: 0,
    offset_y: 0,
    scale_multiplier: 1.0,
    rotation: 0,
    fit_mode: 'contain'
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatingType, setGeneratingType] = useState<'production' | 'mockup' | null>(null);
  const [generatedJob, setGeneratedJob] = useState<DesignJob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initialPatternId prop
  useEffect(() => {
    if (initialPatternId) {
      setSelectedPatternId(initialPatternId);
    }
  }, [initialPatternId]);

  // Load initial patterns & templates
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [patternsData, templatesData] = await Promise.all([
        ApiService.getPatterns(true),
        ApiService.getTemplates()
      ]);
      setPatterns(patternsData);
      setTemplates(templatesData);
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
    }
  };

  const selectedPattern = patterns.find(p => p.pattern_id === selectedPatternId) || patterns[0];
  const requiresFront = selectedPattern?.required_uploads.includes('front');
  const requiresBack = selectedPattern?.required_uploads.includes('back');

  const frontSlots = selectedPattern?.front_slots || [];
  const backSlots = selectedPattern?.back_slots || [];
  const frontSlotLabel = frontSlots.length > 0 ? (frontSlots[0].label || 'Front Artwork') : 'Front Artwork';
  const backSlotLabel = backSlots.length > 0 ? (backSlots[0].label || 'Back Artwork') : 'Back Artwork';

  // Handle file uploads
  const handleFileUpload = async (file: File, side: 'front' | 'back') => {
    if (side === 'front') setIsUploadingFront(true);
    else setIsUploadingBack(true);
    setErrorMessage(null);

    try {
      const res = await ApiService.uploadArtwork(file);
      if (side === 'front') setFrontArtwork(res);
      else setBackArtwork(res);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to upload artwork.');
    } finally {
      if (side === 'front') setIsUploadingFront(false);
      else setIsUploadingBack(false);
    }
  };

  // Reset transforms
  const handleResetTransform = (side: 'front' | 'back') => {
    const defaultTransform = {
      offset_x: 0,
      offset_y: 0,
      scale_multiplier: 1.0,
      rotation: 0,
      fit_mode: 'contain'
    };
    if (side === 'front') setFrontTransform(defaultTransform);
    else setBackTransform(defaultTransform);
  };

  // Fetch backend preview whenever in realistic mode or on demand
  const fetchBackendPreview = useCallback(async () => {
    if (!selectedPatternId) return;
    setIsLoadingPreview(true);
    try {
      const res = await ApiService.get2x2Preview({
        pattern_id: selectedPatternId,
        front_artwork_id: frontArtwork?.artwork_id,
        back_artwork_id: backArtwork?.artwork_id,
        transforms: {
          front: frontTransform,
          back: backTransform
        },
        include_labels: includeLabels,
        mode: previewMode,
        mockup_params: mockupParams
      });
      setBackendPreviewUrl(res.preview_url);
    } catch (err) {
      console.error('Failed to fetch backend preview:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [selectedPatternId, frontArtwork, backArtwork, frontTransform, backTransform, includeLabels, previewMode, mockupParams]);

  useEffect(() => {
    if (previewMode === 'realistic' && (frontArtwork || backArtwork)) {
      const timer = setTimeout(() => {
        fetchBackendPreview();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [previewMode, frontArtwork, backArtwork, frontTransform, backTransform, mockupParams, fetchBackendPreview]);

  // Generate PNG (triggers both, then downloads the desired version)
  const handleGenerate = async (downloadTarget: 'production' | 'mockup' = 'production') => {
    setErrorMessage(null);

    if (requiresFront && !frontArtwork) {
      setErrorMessage(`Front artwork is required for ${selectedPattern?.name || 'this pattern'}.`);
      return;
    }
    if (requiresBack && !backArtwork) {
      setErrorMessage(`Back artwork is required for ${selectedPattern?.name || 'this pattern'}.`);
      return;
    }

    setIsGenerating(true);
    setGeneratingType(downloadTarget);

    try {
      const job = await ApiService.generatePng({
        color,
        style,
        pattern_id: selectedPatternId,
        front_artwork_id: frontArtwork?.artwork_id,
        back_artwork_id: backArtwork?.artwork_id,
        transforms: {
          front: frontTransform,
          back: backTransform
        },
        include_labels: includeLabels,
        generate_mockup: true,
        mockup_params: mockupParams
      });

      setGeneratedJob(job);

      // Celebrate
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });

      // Trigger download for the clicked target
      const dlUrl = downloadTarget === 'mockup' ? (job.mockup_download_url || `/api/design/download/${job.id}?type=mockup`) : (job.download_url || `/api/design/download/${job.id}?type=production`);
      const dlName = downloadTarget === 'mockup' ? `tshirt_${selectedPatternId}_mockup.png` : `tshirt_${selectedPatternId}_production.png`;

      const link = document.createElement('a');
      link.href = dlUrl;
      link.setAttribute('download', dlName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'PNG generation failed.');
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
    }
  };

  // Resolve active print zones for front & back
  const activeTemplate = templates[0];
  const frontZoneCode = frontSlots.length > 0 ? frontSlots[0].zone_code : 'FULL_FRONT';
  const backZoneCode = backSlots.length > 0 ? backSlots[0].zone_code : 'FULL_BACK';

  const frontZone = activeTemplate?.zones.find(z => z.zone_code === frontZoneCode) || {
    name: 'Full Front Graphic',
    zone_code: frontZoneCode,
    x: 864,
    y: 640,
    width: 970,
    height: 1451,
    safe_margin: 20
  };

  const backZone = activeTemplate?.zones.find(z => z.zone_code === backZoneCode) || {
    name: 'Full Back Graphic',
    zone_code: backZoneCode,
    x: 750,
    y: 550,
    width: 1200,
    height: 1650,
    safe_margin: 20
  };

  const canvasW = 2700;
  const canvasH = 2643;

  const currentTransform = activeTuningTab === 'front' ? frontTransform : backTransform;

  // Render quadrant in interactive flat preview
  const renderQuadrant = (
    viewKey: 'black_front' | 'black_back' | 'white_front' | 'white_back',
    label: string,
    shirtSide: 'front' | 'back',
    shirtColor: 'black' | 'white'
  ) => {
    const isFront = shirtSide === 'front';
    const zone = isFront ? frontZone : backZone;
    const tf = isFront ? frontTransform : backTransform;
    const art = isFront ? frontArtwork : backArtwork;
    const isReq = isFront ? requiresFront : requiresBack;

    const zoneLeftPct = (zone.x / canvasW) * 100;
    const zoneTopPct = (zone.y / canvasH) * 100;
    const zoneWidthPct = (zone.width / canvasW) * 100;
    const zoneHeightPct = (zone.height / canvasH) * 100;

    const artOffsetXPct = (tf.offset_x / canvasW) * 100;
    const artOffsetYPct = (tf.offset_y / canvasH) * 100;

    const mockupSrc = `/mockups/${shirtColor}_${shirtSide}.png`;

    return (
      <div 
        key={viewKey}
        className="relative bg-[#070b12] rounded-lg overflow-hidden border border-[#1e293d]/80 flex flex-col items-center justify-center p-2 group"
      >
        {/* Quadrant Header Badge */}
        <div className="absolute top-2 left-2 z-30 flex items-center space-x-1.5 bg-black/75 backdrop-blur px-2 py-0.5 rounded text-[10px] font-semibold text-slate-300 border border-slate-700/60 shadow">
          <span className={`w-2 h-2 rounded-full ${shirtColor === 'black' ? 'bg-slate-900 border border-slate-600' : 'bg-white border border-slate-300'}`} />
          <span>{label}</span>
        </div>

        {includeLabels && (
          <div className="absolute top-8 left-2 z-30 text-[9px] font-mono font-bold tracking-wider text-slate-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
            {label.toUpperCase()}
          </div>
        )}

        <div className="relative w-full aspect-[2700/2643] flex items-center justify-center">
          <img
            src={mockupSrc}
            alt={label}
            className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
          />

          {showBoundingBox && isReq && (
            <div
              style={{
                position: 'absolute',
                left: `${zoneLeftPct}%`,
                top: `${zoneTopPct}%`,
                width: `${zoneWidthPct}%`,
                height: `${zoneHeightPct}%`,
              }}
              className="border border-dashed border-blue-400/60 bg-blue-500/5 rounded pointer-events-none z-10 flex flex-col justify-between p-0.5"
            >
              <span className="text-[7px] font-mono text-blue-300 font-bold bg-blue-950/90 px-1 rounded self-start truncate max-w-full">
                {zone.name || zone.zone_code}
              </span>
            </div>
          )}

          {art && isReq && (
            <div
              style={{
                position: 'absolute',
                left: `${zoneLeftPct + artOffsetXPct}%`,
                top: `${zoneTopPct + artOffsetYPct}%`,
                width: `${zoneWidthPct}%`,
                height: `${zoneHeightPct}%`,
                transform: `rotate(${tf.rotation}deg) scale(${tf.scale_multiplier})`,
                transformOrigin: 'center center',
              }}
              className="z-20 flex items-center justify-center pointer-events-none transition-transform duration-75"
            >
              <img
                src={art.url}
                alt="Composited Artwork"
                style={{
                  objectFit: (tf.fit_mode === 'stretch' ? 'fill' : tf.fit_mode === 'cover' ? 'cover' : 'contain') as any,
                }}
                className="max-w-full max-h-full filter drop-shadow-md"
              />
            </div>
          )}

          {!art && isReq && (
            <div
              style={{
                position: 'absolute',
                left: `${zoneLeftPct}%`,
                top: `${zoneTopPct}%`,
                width: `${zoneWidthPct}%`,
                height: `${zoneHeightPct}%`,
              }}
              className="z-10 flex items-center justify-center text-center p-2 pointer-events-none"
            >
              <span className="text-[8px] text-slate-400/70 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                {shirtSide.toUpperCase()} artwork slot
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header Banner & Dual Download Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#101726] via-[#141e33] to-[#0f172a] border border-[#1e293d] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
              Production PNG & Realistic Mockup Engine
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
              2×2 High-Res Canvas (5400×5286 px)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mt-2">
            T-Shirt Design Studio
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Configure artwork placement across 15 print patterns. Generate factory-accurate Production PNG sheets alongside photorealistic fabric-blended mockups.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => handleGenerate('production')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
          >
            {isGenerating && generatingType === 'production' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Download Production PNG</span>
          </button>

          <button
            type="button"
            disabled={isGenerating}
            onClick={() => handleGenerate('mockup')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
          >
            {isGenerating && generatingType === 'mockup' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            <span>Download Realistic Mockup PNG</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Left Controls, Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Controls */}
        <div className="lg:col-span-5 space-y-5">

          {/* STEP 1: Garment Color */}
          <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4">
            <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block mb-3">
              Step 1: Primary Garment Color
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setColor('Black')}
                className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                  color === 'Black'
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                    : 'border-[#1e293d] bg-[#0e1422] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-[#121212] border border-slate-700 shadow-inner" />
                  <span className="text-sm font-medium text-white">Black Tee</span>
                </div>
                {color === 'Black' && <Check className="w-4 h-4 text-blue-400" />}
              </button>

              <button
                type="button"
                onClick={() => setColor('White')}
                className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                  color === 'White'
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                    : 'border-[#1e293d] bg-[#0e1422] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-white border border-slate-300 shadow-inner" />
                  <span className="text-sm font-medium text-white">White Tee</span>
                </div>
                {color === 'White' && <Check className="w-4 h-4 text-blue-400" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Note: The 2×2 composite sheet automatically renders both Black and White shirts (all 4 views) simultaneously.
            </p>
          </div>

          {/* STEP 2: Garment Style */}
          <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4">
            <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block mb-3">
              Step 2: Fit / Silhouette Style
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStyle('Oversized')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  style === 'Oversized'
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                    : 'border-[#1e293d] bg-[#0e1422] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Oversized</span>
                  {style === 'Oversized' && <Check className="w-4 h-4 text-blue-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Boxy dropped-shoulder streetwear fit</p>
              </button>

              <button
                type="button"
                onClick={() => setStyle('Regular')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  style === 'Regular'
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                    : 'border-[#1e293d] bg-[#0e1422] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Regular Crewneck</span>
                  {style === 'Regular' && <Check className="w-4 h-4 text-blue-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Classic standard tailored everyday fit</p>
              </button>
            </div>
          </div>

          {/* STEP 3: Pattern Selector */}
          <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                Step 3: Pattern Preset ({patterns.length} Available)
              </label>
              <span className="text-[11px] text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {selectedPattern?.preview_badge || 'Pattern'}
              </span>
            </div>

            <select
              value={selectedPatternId}
              onChange={(e) => setSelectedPatternId(e.target.value)}
              className="w-full bg-[#0e1422] border border-[#1e293d] text-white rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
            >
              {patterns.map((p) => (
                <option key={p.pattern_id} value={p.pattern_id}>
                  {p.name} ({p.preview_badge})
                </option>
              ))}
            </select>
            {selectedPattern && (
              <div className="mt-2.5 bg-[#0a0e17] p-2.5 rounded-lg border border-[#1e293d]/60 text-xs space-y-1">
                <p className="text-slate-300 font-medium">{selectedPattern.description}</p>
                <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1">
                  <span>Front Zone: <strong className="text-blue-400 font-mono">{frontSlotLabel}</strong></span>
                  <span>•</span>
                  <span>Back Zone: <strong className="text-indigo-400 font-mono">{backSlotLabel}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* STEP 4: DYNAMIC ARTWORK UPLOADS */}
          <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                Step 4: Upload Artwork
              </label>
              <span className="text-[11px] text-slate-400">
                PNG, JPG, WEBP, TIFF supported
              </span>
            </div>

            {/* Dynamic Grid: If only front required, full width front. If only back required, full width back. If both, 2 columns. */}
            <div className={`grid gap-3 ${requiresFront && requiresBack ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              
              {/* Front Upload Slot */}
              {requiresFront && (
                <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                  frontArtwork ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[#1e293d] bg-[#0e1422] hover:border-blue-500/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200 uppercase">{frontSlotLabel}</span>
                    <span className="text-[10px] text-rose-400 font-semibold uppercase">Required</span>
                  </div>

                  {frontArtwork ? (
                    <div className="space-y-2">
                      <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center p-1">
                        <img src={frontArtwork.url} alt="Front" className="max-h-full object-contain" />
                      </div>
                      <p className="text-[11px] font-medium text-slate-200 truncate">{frontArtwork.original_name}</p>
                      <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-400">
                        <span>{frontArtwork.inspection.width}×{frontArtwork.inspection.height}px</span>
                        {frontArtwork.inspection.has_transparency && (
                          <span className="px-1 bg-blue-500/20 text-blue-400 rounded">Alpha OK</span>
                        )}
                      </div>
                      <label className="inline-block text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer pt-1">
                        Replace File
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/tiff,image/tif"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'front')}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-4">
                      {isUploadingFront ? (
                        <RefreshCw className="w-8 h-8 mx-auto text-blue-400 animate-spin mb-2" />
                      ) : (
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2 hover:text-blue-400 transition-colors" />
                      )}
                      <span className="text-xs text-blue-400 font-medium block">Upload {frontSlotLabel}</span>
                      <span className="text-[10px] text-slate-400 block mt-1">PNG with transparency, JPG, or TIFF</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/tiff,image/tif"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'front')}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Back Upload Slot */}
              {requiresBack && (
                <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                  backArtwork ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[#1e293d] bg-[#0e1422] hover:border-blue-500/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200 uppercase">{backSlotLabel}</span>
                    <span className="text-[10px] text-rose-400 font-semibold uppercase">Required</span>
                  </div>

                  {backArtwork ? (
                    <div className="space-y-2">
                      <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center p-1">
                        <img src={backArtwork.url} alt="Back" className="max-h-full object-contain" />
                      </div>
                      <p className="text-[11px] font-medium text-slate-200 truncate">{backArtwork.original_name}</p>
                      <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-400">
                        <span>{backArtwork.inspection.width}×{backArtwork.inspection.height}px</span>
                        {backArtwork.inspection.has_transparency && (
                          <span className="px-1 bg-blue-500/20 text-blue-400 rounded">Alpha OK</span>
                        )}
                      </div>
                      <label className="inline-block text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer pt-1">
                        Replace File
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/tiff,image/tif"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'back')}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-4">
                      {isUploadingBack ? (
                        <RefreshCw className="w-8 h-8 mx-auto text-blue-400 animate-spin mb-2" />
                      ) : (
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2 hover:text-blue-400 transition-colors" />
                      )}
                      <span className="text-xs text-blue-400 font-medium block">Upload {backSlotLabel}</span>
                      <span className="text-[10px] text-slate-400 block mt-1">PNG with transparency, JPG, or TIFF</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/tiff,image/tif"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'back')}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Quick Sample Button */}
            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch('/mockups/sample_naruto.png');
                    const blob = await response.blob();
                    const sampleFile = new File([blob], 'sample_naruto_master.png', { type: 'image/png' });
                    if (requiresFront) await handleFileUpload(sampleFile, 'front');
                    if (requiresBack) await handleFileUpload(sampleFile, 'back');
                  } catch (e) {
                    console.error('Sample loading failed:', e);
                  }
                }}
                className="text-xs text-slate-400 hover:text-blue-400 flex items-center space-x-1.5 transition-colors"
              >
                <FileImage className="w-3.5 h-3.5" />
                <span>Quick-load sample master artwork (NARUTO)</span>
              </button>
            </div>
          </div>

          {/* STEP 5: Fine-Tuning Placement & Options */}
          <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Step 5: Fine-Tune Placement
                </span>
              </div>
              <div className="flex items-center space-x-1 bg-[#0e1422] p-0.5 rounded-lg border border-[#1e293d]">
                {requiresFront && (
                  <button
                    type="button"
                    onClick={() => setActiveTuningTab('front')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      activeTuningTab === 'front' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Front Zone
                  </button>
                )}
                {requiresBack && (
                  <button
                    type="button"
                    onClick={() => setActiveTuningTab('back')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      activeTuningTab === 'back' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Back Zone
                  </button>
                )}
              </div>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Shift X:</span>
                  <span className="font-mono text-slate-200">{currentTransform.offset_x}px</span>
                </div>
                <input
                  type="range"
                  min="-300"
                  max="300"
                  value={currentTransform.offset_x}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (activeTuningTab === 'front') setFrontTransform(prev => ({ ...prev, offset_x: val }));
                    else setBackTransform(prev => ({ ...prev, offset_x: val }));
                  }}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Shift Y:</span>
                  <span className="font-mono text-slate-200">{currentTransform.offset_y}px</span>
                </div>
                <input
                  type="range"
                  min="-300"
                  max="300"
                  value={currentTransform.offset_y}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (activeTuningTab === 'front') setFrontTransform(prev => ({ ...prev, offset_y: val }));
                    else setBackTransform(prev => ({ ...prev, offset_y: val }));
                  }}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Scale Zoom:</span>
                  <span className="font-mono text-slate-200">{Math.round(currentTransform.scale_multiplier * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={currentTransform.scale_multiplier}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (activeTuningTab === 'front') setFrontTransform(prev => ({ ...prev, scale_multiplier: val }));
                    else setBackTransform(prev => ({ ...prev, scale_multiplier: val }));
                  }}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Rotation:</span>
                  <span className="font-mono text-slate-200">{currentTransform.rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={currentTransform.rotation}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (activeTuningTab === 'front') setFrontTransform(prev => ({ ...prev, rotation: val }));
                    else setBackTransform(prev => ({ ...prev, rotation: val }));
                  }}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            {/* Fit Mode Selector & Reset */}
            <div className="flex items-center justify-between pt-2 border-t border-[#1e293d]/60 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Fit Mode:</span>
                <select
                  value={currentTransform.fit_mode || 'contain'}
                  onChange={(e) => {
                    const mode = e.target.value;
                    if (activeTuningTab === 'front') setFrontTransform(prev => ({ ...prev, fit_mode: mode }));
                    else setBackTransform(prev => ({ ...prev, fit_mode: mode }));
                  }}
                  className="bg-[#0e1422] border border-[#1e293d] text-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="contain">Contain (Proportional)</option>
                  <option value="cover">Cover (Fill & Crop)</option>
                  <option value="stretch">Stretch (Fit Zone)</option>
                  <option value="original">Original (Native Resolution)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleResetTransform(activeTuningTab)}
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Transform</span>
              </button>
            </div>
          </div>

          {/* STEP 6: REALISTIC MOCKUP CONTROLS PANEL (Visible when Realistic Mockup is active) */}
          {previewMode === 'realistic' && (
            <div className="bg-[#121927] border border-indigo-500/40 rounded-xl p-4 space-y-3.5 shadow-lg shadow-indigo-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                    Realistic Mockup Controls
                  </span>
                </div>
                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-mono">
                  Fabric Simulation
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Blend Strength:</span>
                    <span className="font-mono text-slate-200">{mockupParams.blend_strength}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={mockupParams.blend_strength}
                    onChange={(e) => setMockupParams(prev => ({ ...prev, blend_strength: Number(e.target.value) }))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Print Opacity:</span>
                    <span className="font-mono text-slate-200">{mockupParams.print_opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={mockupParams.print_opacity}
                    onChange={(e) => setMockupParams(prev => ({ ...prev, print_opacity: Number(e.target.value) }))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Fabric Deformation:</span>
                    <span className="font-mono text-slate-200">{mockupParams.fabric_deformation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={mockupParams.fabric_deformation}
                    onChange={(e) => setMockupParams(prev => ({ ...prev, fabric_deformation: Number(e.target.value) }))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Fabric Texture:</span>
                    <span className="font-mono text-slate-200">{mockupParams.fabric_texture}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={mockupParams.fabric_texture}
                    onChange={(e) => setMockupParams(prev => ({ ...prev, fabric_texture: Number(e.target.value) }))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Shading Strength:</span>
                    <span className="font-mono text-slate-200">{mockupParams.shading_strength}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={mockupParams.shading_strength}
                    onChange={(e) => setMockupParams(prev => ({ ...prev, shading_strength: Number(e.target.value) }))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Blend Mode:</span>
                    <span className="font-mono text-slate-200 uppercase">{mockupParams.blend_mode}</span>
                  </div>
                  <select
                    value={mockupParams.blend_mode}
                    onChange={(e) => setMockupParams(prev => ({ ...prev, blend_mode: e.target.value }))}
                    className="w-full bg-[#0e1422] border border-[#1e293d] text-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value="auto">Auto (Smart Fabric Blend)</option>
                    <option value="soft_light">Soft Light (Natural Ink)</option>
                    <option value="multiply">Multiply (White Fabric Only)</option>
                    <option value="overlay">Overlay (High Contrast)</option>
                    <option value="normal">Normal (Opaque Print)</option>
                    <option value="screen">Screen (Light Ink)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* DUAL GENERATE / DOWNLOAD BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => handleGenerate('production')}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isGenerating && generatingType === 'production' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>COMPILING PRODUCTION...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>GENERATE PRODUCTION PNG</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={() => handleGenerate('mockup')}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isGenerating && generatingType === 'mockup' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>RENDERING MOCKUP...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>GENERATE REALISTIC MOCKUP</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: 2x2 QUAD VIEW PREVIEW */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 flex flex-col h-full">
            
            {/* Toolbar: Preview Mode Toggle + View Layout Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1e293d]">
              
              {/* Toggle 1: Flat Preview vs Realistic Mockup */}
              <div className="flex items-center space-x-1.5 bg-[#0e1422] p-1 rounded-lg border border-[#1e293d]">
                <button
                  type="button"
                  onClick={() => setPreviewMode('flat')}
                  className={`px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    previewMode === 'flat' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Flat Placement</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewMode('realistic');
                    fetchBackendPreview();
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    previewMode === 'realistic' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Realistic Mockup</span>
                </button>
              </div>

              {/* View Layout Controls */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 bg-[#0e1422] p-1 rounded-lg border border-[#1e293d]">
                  <button
                    type="button"
                    onClick={() => setViewMode('2x2')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                      viewMode === '2x2' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Grid className="w-3 h-3" />
                    <span>2×2 Sheet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('single')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                      viewMode === 'single' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Focus View</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBoundingBox(!showBoundingBox)}
                  className={`px-2.5 py-1 rounded text-xs border flex items-center space-x-1.5 transition-colors ${
                    showBoundingBox
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-[#0e1422] border-[#1e293d] text-slate-400'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>{showBoundingBox ? 'Hide Zones' : 'Show Zones'}</span>
                </button>
              </div>
            </div>

            {/* Single Focus View Sub-Bar */}
            {viewMode === 'single' && (
              <div className="flex items-center space-x-2 py-2 border-b border-[#1e293d]/50 text-xs overflow-x-auto">
                <span className="text-slate-400 shrink-0">Focus view:</span>
                {(['black_front', 'black_back', 'white_front', 'white_back'] as const).map((vk) => (
                  <button
                    key={vk}
                    type="button"
                    onClick={() => setFocusedView(vk)}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                      focusedView === vk ? 'bg-indigo-600 text-white' : 'bg-[#0e1422] text-slate-400 hover:text-white'
                    }`}
                  >
                    {vk.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {/* Canvas Area: 2x2 Sheet or Focused Quadrant */}
            <div className="relative flex-1 min-h-[520px] bg-[#070a10] rounded-xl mt-3 overflow-hidden p-3 border border-[#1e293d]/60 select-none flex flex-col justify-center">
              
              {/* If in Realistic Mockup mode and backend preview has loaded, display the authoritative 2x2 render */}
              {previewMode === 'realistic' && backendPreviewUrl && (
                <div className="relative w-full max-w-[620px] mx-auto rounded-lg overflow-hidden border border-indigo-500/30 shadow-2xl">
                  {isLoadingPreview && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center space-x-2 text-indigo-300 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Rendering Fabric Simulation...</span>
                    </div>
                  )}
                  <img
                    src={backendPreviewUrl}
                    alt="Realistic 2x2 Mockup Preview"
                    className="w-full h-auto object-contain select-none"
                  />
                </div>
              )}

              {/* Otherwise (Flat mode or realistic pending first render), display interactive canvas */}
              {(previewMode === 'flat' || !backendPreviewUrl) && (
                viewMode === '2x2' ? (
                  <div className="grid grid-cols-2 gap-3 w-full max-w-[620px] mx-auto">
                    {renderQuadrant('black_front', 'Black Front', 'front', 'black')}
                    {renderQuadrant('black_back', 'Black Back', 'back', 'black')}
                    {renderQuadrant('white_front', 'White Front', 'front', 'white')}
                    {renderQuadrant('white_back', 'White Back', 'back', 'white')}
                  </div>
                ) : (
                  <div className="max-w-[420px] w-full mx-auto">
                    {focusedView === 'black_front' && renderQuadrant('black_front', 'Black Front', 'front', 'black')}
                    {focusedView === 'black_back' && renderQuadrant('black_back', 'Black Back', 'back', 'black')}
                    {focusedView === 'white_front' && renderQuadrant('white_front', 'White Front', 'front', 'white')}
                    {focusedView === 'white_back' && renderQuadrant('white_back', 'White Back', 'back', 'white')}
                  </div>
                )
              )}
            </div>

            {/* Bottom Status & Info Bar */}
            <div className="mt-3 pt-3 border-t border-[#1e293d] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Production Output: <strong className="text-slate-200">5400 × 5286 px (2×2 PNG Sheet)</strong></span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                Front: {frontZone.name} ({Math.round(frontZone.width)}×{Math.round(frontZone.height)}px)
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
