import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  ZoomIn,
  Move
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ApiService } from '../../services/api';
import { Pattern, Template, PrintZone, SlotTransform, ArtworkUploadResult, DesignJob } from '../../types';

export const DesignGenerator: React.FC = () => {
  // Config state
  const [color, setColor] = useState<'White' | 'Black'>('Black');
  const [style, setStyle] = useState<'Regular' | 'Oversized'>('Oversized');
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedPatternId, setSelectedPatternId] = useState<string>('small_front_full_back');
  const [templates, setTemplates] = useState<Template[]>([]);
  
  // Uploads
  const [frontArtwork, setFrontArtwork] = useState<ArtworkUploadResult | null>(null);
  const [backArtwork, setBackArtwork] = useState<ArtworkUploadResult | null>(null);
  const [isUploadingFront, setIsUploadingFront] = useState<boolean>(false);
  const [isUploadingBack, setIsUploadingBack] = useState<boolean>(false);

  // Preview & Transforms
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
  const [showBoundingBox, setShowBoundingBox] = useState<boolean>(true);
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
  const [generatedJob, setGeneratedJob] = useState<DesignJob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load initial patterns & templates
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [patternsData, templatesData] = await Promise.all([
        ApiService.getPatterns(),
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

  // Generate PSD
  const handleGenerate = async () => {
    setErrorMessage(null);

    if (requiresFront && !frontArtwork) {
      setErrorMessage('Front artwork is required for this pattern.');
      return;
    }
    if (requiresBack && !backArtwork) {
      setErrorMessage('Back artwork is required for this pattern.');
      return;
    }

    setIsGenerating(true);
    try {
      const job = await ApiService.generatePsd({
        color,
        style,
        pattern_id: selectedPatternId,
        front_artwork_id: frontArtwork?.artwork_id,
        back_artwork_id: backArtwork?.artwork_id,
        transforms: {
          front: frontTransform,
          back: backTransform
        }
      });

      setGeneratedJob(job);

      // Celebrate with confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Automatically trigger download
      if (job.download_url) {
        const link = document.createElement('a');
        link.href = job.download_url;
        link.setAttribute('download', `${job.job_code}.psd`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'PSD generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Compute mockup image URL for preview
  const currentMockupUrl = `/mockups/${color.toLowerCase()}_${previewSide}.png`;

  // Get active zone for preview side
  const activeTemplate = templates[0];
  const activeSlots = previewSide === 'front' ? selectedPattern?.front_slots : selectedPattern?.back_slots;
  const activeZoneCode = activeSlots && activeSlots.length > 0 ? activeSlots[0].zone_code : (previewSide === 'front' ? 'FULL_FRONT' : 'FULL_BACK');
  const activeZone = activeTemplate?.zones.find(z => z.zone_code === activeZoneCode) || {
    name: previewSide === 'front' ? 'Full Front Graphic' : 'Full Back Graphic',
    zone_code: activeZoneCode,
    x: previewSide === 'front' ? 864 : 750,
    y: previewSide === 'front' ? 640 : 550,
    width: previewSide === 'front' ? 970 : 1200,
    height: previewSide === 'front' ? 1451 : 1650,
    safe_margin: 20
  };

  const currentTransform = previewSide === 'front' ? frontTransform : backTransform;
  const currentArtwork = previewSide === 'front' ? frontArtwork : backArtwork;

  // Convert canvas pixel coordinates (2700x2643) to percentage for responsive mockup overlay
  const canvasW = 2700;
  const canvasH = 2643;

  const zoneLeftPct = (activeZone.x / canvasW) * 100;
  const zoneTopPct = (activeZone.y / canvasH) * 100;
  const zoneWidthPct = (activeZone.width / canvasW) * 100;
  const zoneHeightPct = (activeZone.height / canvasH) * 100;

  // Artwork position with user offsets
  const artOffsetXPct = (currentTransform.offset_x / canvasW) * 100;
  const artOffsetYPct = (currentTransform.offset_y / canvasH) * 100;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Design Generator</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              PSD Engine
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure garment, select pattern, upload artwork, fine-tune placement, and compile a real production PSD.
          </p>
        </div>

        {generatedJob && (
          <div className="flex items-center space-x-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2">
            <Check className="w-5 h-5 text-emerald-400" />
            <div className="text-xs">
              <span className="text-emerald-300 font-medium block">Ready to Download:</span>
              <span className="text-slate-300 font-mono">{generatedJob.job_code}.psd</span>
            </div>
            <a
              href={generatedJob.download_url}
              download
              className="ml-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-600/30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Left Controls, Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Steps 1 - 4 & Fine Tuning */}
        <div className="lg:col-span-6 space-y-5">

          {/* STEP 1: Garment Color */}
          <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4">
            <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block mb-3">
              Step 1: T-Shirt Color
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

          {/* STEP 3: Print Pattern Selection */}
          <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                Step 3: Select Print Pattern
              </label>
              <span className="text-[11px] text-blue-400 font-medium">{patterns.length} Available</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {patterns.map((p) => {
                const isSelected = p.pattern_id === selectedPatternId;
                return (
                  <button
                    key={p.pattern_id}
                    type="button"
                    onClick={() => {
                      setSelectedPatternId(p.pattern_id);
                      if (!p.required_uploads.includes('front') && p.required_uploads.includes('back')) {
                        setPreviewSide('back');
                      } else {
                        setPreviewSide('front');
                      }
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all relative ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/15 shadow-md shadow-blue-500/20'
                        : 'border-[#1e293d] bg-[#0e1422] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate max-w-[170px]">{p.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 font-medium">
                        {p.preview_badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-1">{p.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 4: Dynamic Artwork Uploads */}
          <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-4">
            <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
              Step 4: Upload Required Artwork
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Front Upload */}
              {requiresFront ? (
                <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                  frontArtwork ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[#1e293d] bg-[#0e1422] hover:border-blue-500/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200">FRONT ARTWORK</span>
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
                          <span className="px-1 bg-blue-500/20 text-blue-400 rounded">Transparent</span>
                        )}
                      </div>
                      <label className="inline-block text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer pt-1">
                        Replace File
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'front')}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-4">
                      <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2 group-hover:text-blue-400 transition-colors" />
                      <span className="text-xs text-blue-400 font-medium block">Upload Front Graphic</span>
                      <span className="text-[10px] text-slate-400 block mt-1">PNG (transparent) or JPG</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'front')}
                      />
                    </label>
                  )}
                </div>
              ) : (
                <div className="border border-[#1e293d] rounded-xl p-4 text-center bg-[#0b0f17]/50 flex flex-col items-center justify-center text-slate-400">
                  <span className="text-xs font-medium">Front Blank</span>
                  <span className="text-[10px] mt-1">Pattern requires no front artwork</span>
                </div>
              )}

              {/* Back Upload */}
              {requiresBack ? (
                <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                  backArtwork ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[#1e293d] bg-[#0e1422] hover:border-blue-500/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200">BACK ARTWORK</span>
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
                          <span className="px-1 bg-blue-500/20 text-blue-400 rounded">Transparent</span>
                        )}
                      </div>
                      <label className="inline-block text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer pt-1">
                        Replace File
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'back')}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-4">
                      <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2 group-hover:text-blue-400 transition-colors" />
                      <span className="text-xs text-blue-400 font-medium block">Upload Back Graphic</span>
                      <span className="text-[10px] text-slate-400 block mt-1">PNG (transparent) or JPG</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'back')}
                      />
                    </label>
                  )}
                </div>
              ) : (
                <div className="border border-[#1e293d] rounded-xl p-4 text-center bg-[#0b0f17]/50 flex flex-col items-center justify-center text-slate-400">
                  <span className="text-xs font-medium">Back Blank</span>
                  <span className="text-[10px] mt-1">Pattern requires no back artwork</span>
                </div>
              )}
            </div>

            {/* Quick Sample Button for Testing */}
            <div className="pt-1">
              <button
                type="button"
                onClick={async () => {
                  // Load sample Naruto image
                  try {
                    const response = await fetch('/mockups/sample_naruto.png');
                    const blob = await response.blob();
                    const sampleFile = new File([blob], 'sample_artwork.png', { type: 'image/png' });
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

          {/* Fine Tuning Controls for Current View */}
          <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Fine-Tune {previewSide.toUpperCase()} Placement</span>
              </label>
              <button
                type="button"
                onClick={() => handleResetTransform(previewSide)}
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Shift X:</span>
                  <span className="font-mono text-slate-200">{currentTransform.offset_x}px</span>
                </div>
                <input
                  type="range"
                  min="-200"
                  max="200"
                  value={currentTransform.offset_x}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (previewSide === 'front') setFrontTransform(prev => ({ ...prev, offset_x: val }));
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
                  min="-200"
                  max="200"
                  value={currentTransform.offset_y}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (previewSide === 'front') setFrontTransform(prev => ({ ...prev, offset_y: val }));
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
                    if (previewSide === 'front') setFrontTransform(prev => ({ ...prev, scale_multiplier: val }));
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
                    if (previewSide === 'front') setFrontTransform(prev => ({ ...prev, rotation: val }));
                    else setBackTransform(prev => ({ ...prev, rotation: val }));
                  }}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>
          </div>

          {/* STEP 6: GENERATE BUTTON */}
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 flex items-center justify-center space-x-3 transition-all transform active:scale-[0.99] disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Compiling 2700×2643 PSD Layers...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>GENERATE PRINT-READY PSD</span>
              </>
            )}
          </button>
        </div>

        {/* RIGHT COLUMN: Interactive 2D Mockup Preview */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 flex flex-col h-full">
            {/* Preview Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293d]">
              <div className="flex items-center space-x-1.5 bg-[#0e1422] p-1 rounded-lg border border-[#1e293d]">
                <button
                  type="button"
                  onClick={() => setPreviewSide('front')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    previewSide === 'front'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  FRONT VIEW
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSide('back')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    previewSide === 'back'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  BACK VIEW
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBoundingBox(!showBoundingBox)}
                  className={`px-2.5 py-1 rounded text-xs border flex items-center space-x-1.5 transition-colors ${
                    showBoundingBox
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-[#0e1422] border-[#1e293d] text-slate-400'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showBoundingBox ? 'Hide Print Zone' : 'Show Print Zone'}</span>
                </button>
              </div>
            </div>

            {/* Visual Canvas Area */}
            <div className="relative flex-1 min-h-[460px] bg-[#090d14] rounded-lg mt-3 overflow-hidden flex items-center justify-center p-2 border border-[#1e293d]/60 select-none">
              
              {/* Responsive T-shirt Mockup Image */}
              <div className="relative w-full max-w-[520px] aspect-[2700/2643] flex items-center justify-center">
                <img
                  src={currentMockupUrl}
                  alt={`${color} ${previewSide}`}
                  className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
                />

                {/* Print Zone Boundary Outline */}
                {showBoundingBox && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${zoneLeftPct}%`,
                      top: `${zoneTopPct}%`,
                      width: `${zoneWidthPct}%`,
                      height: `${zoneHeightPct}%`,
                    }}
                    className="border-2 border-dashed border-blue-400/70 bg-blue-500/5 rounded pointer-events-none z-10 flex flex-col justify-between p-1"
                  >
                    <span className="text-[9px] font-mono text-blue-300 font-bold bg-blue-950/80 px-1 py-0.5 rounded self-start">
                      {activeZone.name || activeZoneCode}
                    </span>
                    <span className="text-[8px] font-mono text-blue-400/80 self-end">
                      {Math.round(activeZone.width)}×{Math.round(activeZone.height)}px
                    </span>
                  </div>
                )}

                {/* Artwork Layer Overlay */}
                {currentArtwork && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${zoneLeftPct + artOffsetXPct}%`,
                      top: `${zoneTopPct + artOffsetYPct}%`,
                      width: `${zoneWidthPct}%`,
                      height: `${zoneHeightPct}%`,
                      transform: `rotate(${currentTransform.rotation}deg) scale(${currentTransform.scale_multiplier})`,
                      transformOrigin: 'center center',
                    }}
                    className="z-20 flex items-center justify-center pointer-events-none transition-transform duration-75"
                  >
                    <img
                      src={currentArtwork.url}
                      alt="Placed Artwork"
                      className="max-w-full max-h-full object-contain filter drop-shadow-lg"
                    />
                  </div>
                )}

                {/* Empty Artwork Placeholder Prompt */}
                {!currentArtwork && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${zoneLeftPct}%`,
                      top: `${zoneTopPct}%`,
                      width: `${zoneWidthPct}%`,
                      height: `${zoneHeightPct}%`,
                    }}
                    className="z-10 flex items-center justify-center text-center p-4 pointer-events-none"
                  >
                    <span className="text-xs text-slate-400/80 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
                      Upload {previewSide.toUpperCase()} artwork to preview
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Info Bar */}
            <div className="mt-3 pt-3 border-t border-[#1e293d] flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Zone: <strong className="text-slate-200">{activeZone.name || activeZoneCode}</strong></span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                Coords: X:{Math.round(activeZone.x)} Y:{Math.round(activeZone.y)} ({Math.round(activeZone.width)}×{Math.round(activeZone.height)}px)
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
