import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, 
  Save, 
  RotateCcw, 
  Eye, 
  Move, 
  Maximize2, 
  Check, 
  AlertCircle,
  Layers,
  HelpCircle,
  Plus
} from 'lucide-react';
import { ApiService } from '../../services/api';
import { Template, PrintZone } from '../../types';

export const TemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>('front');
  const [currentColor, setCurrentColor] = useState<'black' | 'white'>('black');
  
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [currentZone, setCurrentZone] = useState<PrintZone | null>(null);
  
  // Dragging & Resizing state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialZonePos, setInitialZonePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await ApiService.getTemplates();
      setTemplates(data);
      if (data.length > 0) {
        setSelectedTemplateId(data[0].id);
        const frontZones = data[0].zones.filter(z => z.side === 'front');
        if (frontZones.length > 0) {
          setSelectedZoneId(frontZones[0].id);
          setCurrentZone(frontZones[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const sideZones = activeTemplate?.zones.filter(z => z.side === currentSide) || [];

  // When side or zone selection changes
  const handleSelectZone = (zone: PrintZone) => {
    setSelectedZoneId(zone.id);
    setCurrentZone({ ...zone });
    setSaveStatus(null);
  };

  const handleSideChange = (side: 'front' | 'back') => {
    setCurrentSide(side);
    const zonesForSide = activeTemplate?.zones.filter(z => z.side === side) || [];
    if (zonesForSide.length > 0) {
      handleSelectZone(zonesForSide[0]);
    } else {
      setSelectedZoneId(null);
      setCurrentZone(null);
    }
  };

  // Save changes to SQLite database
  const handleSaveCalibration = async () => {
    if (!activeTemplate || !currentZone) return;
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const updated = await ApiService.updateZone(activeTemplate.id, currentZone.id, {
        x: Math.round(currentZone.x),
        y: Math.round(currentZone.y),
        width: Math.round(currentZone.width),
        height: Math.round(currentZone.height),
        rotation: currentZone.rotation,
        scale: currentZone.scale,
        fit_mode: currentZone.fit_mode,
        safe_margin: currentZone.safe_margin
      });

      // Update local state
      setTemplates(prev => prev.map(t => {
        if (t.id === activeTemplate.id) {
          return {
            ...t,
            zones: t.zones.map(z => z.id === updated.id ? updated : z)
          };
        }
        return t;
      }));

      setSaveStatus('Calibration saved successfully to database!');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: any) {
      console.error('Save failed:', err);
      setSaveStatus('Failed to save calibration.');
    } finally {
      setIsSaving(false);
    }
  };

  // Canvas coordinate calculations (2700 x 2643)
  const canvasW = 2700;
  const canvasH = 2643;

  const zoneLeftPct = currentZone ? (currentZone.x / canvasW) * 100 : 0;
  const zoneTopPct = currentZone ? (currentZone.y / canvasH) * 100 : 0;
  const zoneWidthPct = currentZone ? (currentZone.width / canvasW) * 100 : 0;
  const zoneHeightPct = currentZone ? (currentZone.height / canvasH) * 100 : 0;

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!currentZone) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialZonePos({ x: currentZone.x, y: currentZone.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !currentZone || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleFactor = canvasW / rect.width;
    
    const deltaX = (e.clientX - dragStart.x) * scaleFactor;
    const deltaY = (e.clientY - dragStart.y) * scaleFactor;
    
    const newX = Math.max(0, Math.min(canvasW - currentZone.width, initialZonePos.x + deltaX));
    const newY = Math.max(0, Math.min(canvasH - currentZone.height, initialZonePos.y + deltaY));
    
    setCurrentZone(prev => prev ? ({ ...prev, x: Math.round(newX), y: Math.round(newY) }) : null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const currentMockupUrl = `/mockups/${currentColor}_${currentSide}.png`;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" onMouseUp={handleMouseUp}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Template & Print Zone Editor</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              Interactive Calibrator
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Calibrate pixel-accurate print coordinates for any print zone directly on the 2700×2643 px master canvas.
          </p>
        </div>

        {saveStatus && (
          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2 text-emerald-400 text-xs font-semibold animate-pulse">
            <Check className="w-4 h-4" />
            <span>{saveStatus}</span>
          </div>
        )}
      </div>

      {/* Editor Layout: Left Workspace, Right Calibration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Visual Mockup Canvas */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 flex flex-col">
            {/* View Controls Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293d]">
              <div className="flex items-center space-x-2">
                <div className="bg-[#0e1422] p-1 rounded-lg border border-[#1e293d] flex">
                  <button
                    type="button"
                    onClick={() => handleSideChange('front')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                      currentSide === 'front' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    FRONT CANVAS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSideChange('back')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                      currentSide === 'back' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    BACK CANVAS
                  </button>
                </div>

                <div className="bg-[#0e1422] p-1 rounded-lg border border-[#1e293d] flex">
                  <button
                    type="button"
                    onClick={() => setCurrentColor('black')}
                    className={`px-2.5 py-1 rounded text-xs font-medium ${
                      currentColor === 'black' ? 'bg-slate-800 text-white' : 'text-slate-400'
                    }`}
                  >
                    Black
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentColor('white')}
                    className={`px-2.5 py-1 rounded text-xs font-medium ${
                      currentColor === 'white' ? 'bg-slate-800 text-white' : 'text-slate-400'
                    }`}
                  >
                    White
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                <Move className="w-3.5 h-3.5 text-blue-400" />
                <span>Click & drag box to reposition</span>
              </div>
            </div>

            {/* Interactive Canvas */}
            <div 
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              className="relative flex-1 min-h-[500px] bg-[#090d14] rounded-lg mt-3 overflow-hidden flex items-center justify-center p-2 border border-[#1e293d]/60 select-none cursor-crosshair"
            >
              <div className="relative w-full max-w-[540px] aspect-[2700/2643] flex items-center justify-center">
                <img
                  src={currentMockupUrl}
                  alt={`${currentColor} ${currentSide}`}
                  className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
                />

                {/* Render All Zones for Current Side */}
                {sideZones.map((z) => {
                  const isSelected = z.id === selectedZoneId;
                  const left = (z.x / canvasW) * 100;
                  const top = (z.y / canvasH) * 100;
                  const width = (z.width / canvasW) * 100;
                  const height = (z.height / canvasH) * 100;

                  return (
                    <div
                      key={z.id}
                      onClick={() => handleSelectZone(z)}
                      style={{
                        position: 'absolute',
                        left: `${left}%`,
                        top: `${top}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                      }}
                      className={`border-2 rounded transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/30 z-30'
                          : 'border-dashed border-slate-600 bg-slate-700/10 hover:border-slate-400 z-10'
                      }`}
                    >
                      <div className="p-1 flex items-center justify-between">
                        <span className={`text-[9px] font-mono px-1 py-0.5 rounded font-bold ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-900/80 text-slate-300'
                        }`}>
                          {z.name}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Active Draggable Zone Highlight */}
                {currentZone && (
                  <div
                    onMouseDown={handleMouseDown}
                    style={{
                      position: 'absolute',
                      left: `${zoneLeftPct}%`,
                      top: `${zoneTopPct}%`,
                      width: `${zoneWidthPct}%`,
                      height: `${zoneHeightPct}%`,
                    }}
                    className="border-2 border-blue-400 bg-blue-500/20 rounded z-30 cursor-move flex flex-col justify-between p-1.5 shadow-2xl"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded shadow">
                        {currentZone.name}
                      </span>
                      <span className="text-[9px] font-mono text-blue-200 bg-blue-950/80 px-1 py-0.5 rounded">
                        {Math.round(currentZone.width)}×{Math.round(currentZone.height)}px
                      </span>
                    </div>

                    <div className="text-[9px] font-mono text-blue-300 self-end bg-blue-950/80 px-1 py-0.5 rounded">
                      X: {Math.round(currentZone.x)}, Y: {Math.round(currentZone.y)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Canvas Dimensions Bar */}
            <div className="mt-3 pt-3 border-t border-[#1e293d] flex items-center justify-between text-xs text-slate-400">
              <span>Master Canvas: <strong className="text-slate-200">2700 × 2643 px</strong></span>
              <span className="text-slate-400">Authority: OVERSIZED PRINTING flat.psd</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Zone Selection & Coordinate Inputs */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Zone Selector */}
          <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                Select Print Zone ({currentSide.toUpperCase()})
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {sideZones.map((z) => {
                const isSelected = z.id === selectedZoneId;
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => handleSelectZone(z)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/20 text-white shadow-md'
                        : 'border-[#1e293d] bg-[#0e1422] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-semibold block">{z.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{Math.round(z.width)}×{Math.round(z.height)}px</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Numeric Calibration Coordinates Form */}
          {currentZone && (
            <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e293d]">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>Calibrate: {currentZone.name}</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {currentZone.zone_code}
                </span>
              </div>

              {/* Coordinates Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">X Position (px)</label>
                  <input
                    type="number"
                    value={Math.round(currentZone.x)}
                    onChange={(e) => setCurrentZone({ ...currentZone, x: Number(e.target.value) })}
                    className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Y Position (px)</label>
                  <input
                    type="number"
                    value={Math.round(currentZone.y)}
                    onChange={(e) => setCurrentZone({ ...currentZone, y: Number(e.target.value) })}
                    className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={Math.round(currentZone.width)}
                    onChange={(e) => setCurrentZone({ ...currentZone, width: Number(e.target.value) })}
                    className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={Math.round(currentZone.height)}
                    onChange={(e) => setCurrentZone({ ...currentZone, height: Number(e.target.value) })}
                    className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Safe Margin (px)</label>
                  <input
                    type="number"
                    value={currentZone.safe_margin}
                    onChange={(e) => setCurrentZone({ ...currentZone, safe_margin: Number(e.target.value) })}
                    className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Default Fit Mode</label>
                  <select
                    value={currentZone.fit_mode}
                    onChange={(e) => setCurrentZone({ ...currentZone, fit_mode: e.target.value })}
                    className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="contain">Contain (Keep Aspect)</option>
                    <option value="cover">Cover (Fill & Crop)</option>
                    <option value="width">Scale to Width</option>
                    <option value="height">Scale to Height</option>
                    <option value="original">Original Size</option>
                  </select>
                </div>
              </div>

              {/* Save Button */}
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveCalibration}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving to Database...' : 'Save Zone Calibration to Database'}</span>
              </button>
            </div>
          )}

          {/* Quick Calibration Guide */}
          <div className="bg-[#0e1422] border border-[#1e293d] rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center space-x-2 text-slate-300 font-semibold">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span>Calibration Notes:</span>
            </div>
            <p>
              The current <strong>Full Front</strong> calibration (X: 864, Y: 640, 970×1451 px) was extracted directly from your master PSD template layer.
            </p>
            <p>
              Any changes saved here immediately update the backend SQLite database and will be used for all future previews and PSD exports.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
