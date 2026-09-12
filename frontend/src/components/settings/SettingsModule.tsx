import React, { useState } from 'react';
import { Settings, Server, HardDrive, CheckCircle2, RefreshCw, Cpu, Database } from 'lucide-react';
import { ApiService } from '../../services/api';

export const SettingsModule: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<string>('Operational');
  const [isChecking, setIsChecking] = useState(false);

  const testConnection = async () => {
    setIsChecking(true);
    try {
      const res = await ApiService.getHealth();
      setHealthStatus(res.status === 'ok' ? 'Operational' : 'Issue Detected');
    } catch {
      setHealthStatus('Offline');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <span>Studio Settings & Environment</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Local Configuration
          </span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Review localhost server endpoints, Photoshop master template paths, and image processing parameters.
        </p>
      </div>

      <div className="space-y-4">
        {/* Connection Status Card */}
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Local FastAPI Backend</h3>
              <p className="text-xs text-slate-400 font-mono">http://127.0.0.1:8000</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              <span>{healthStatus}</span>
            </span>
            <button
              type="button"
              onClick={testConnection}
              disabled={isChecking}
              className="p-2 rounded-lg bg-[#0e1422] border border-[#1e293d] text-slate-400 hover:text-white transition-colors"
              title="Test Health"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Master Template Specification */}
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span>Master Photoshop Template Details</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#0e1422] border border-[#1e293d] rounded-lg p-3 space-y-1">
              <span className="text-slate-400 block">Master Template Source:</span>
              <span className="text-white font-mono font-semibold block truncate">
                OVERSIZED PRINTING flat.psd
              </span>
              <span className="text-[11px] text-blue-400 font-mono">Safe copy archived in templates/master/</span>
            </div>

            <div className="bg-[#0e1422] border border-[#1e293d] rounded-lg p-3 space-y-1">
              <span className="text-slate-400 block">Authoritative Canvas Resolution:</span>
              <span className="text-white font-mono font-bold text-sm block">
                2700 × 2643 pixels
              </span>
              <span className="text-[11px] text-emerald-400">Standard 8-Bit RGB Color Space</span>
            </div>

            <div className="bg-[#0e1422] border border-[#1e293d] rounded-lg p-3 space-y-1">
              <span className="text-slate-400 block">Extracted Layer Mockups:</span>
              <span className="text-white font-mono block">
                blk frnt, wht frnt, blk bg, wht bg
              </span>
              <span className="text-[11px] text-slate-400">Available in templates/mockups/</span>
            </div>

            <div className="bg-[#0e1422] border border-[#1e293d] rounded-lg p-3 space-y-1">
              <span className="text-slate-400 block">Default Print Quality Target:</span>
              <span className="text-white font-mono font-bold text-sm block">
                300 DPI High-Fidelity
              </span>
              <span className="text-[11px] text-slate-400">Raw RGBA layer preservation without lossy compression</span>
            </div>
          </div>
        </div>

        {/* Database & Storage */}
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Local Database & File Storage</span>
          </h3>

          <div className="text-xs text-slate-300 space-y-2">
            <p>
              • <strong>Database:</strong> SQLite local instance located at <code className="text-blue-400">backend/tshirt_studio.db</code>
            </p>
            <p>
              • <strong>Generated Exports:</strong> Output Photoshop PSD files are written to <code className="text-blue-400">generated/</code>
            </p>
            <p>
              • <strong>Uploaded Artworks:</strong> Artwork images are sanitized and cached in <code className="text-blue-400">uploads/</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
