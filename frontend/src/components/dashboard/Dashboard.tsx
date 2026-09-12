import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Layers, 
  Sliders, 
  Package, 
  ArrowRight, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Cpu
} from 'lucide-react';
import { ApiService } from '../../services/api';
import { AnalyticsData } from '../../types';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await ApiService.getAnalytics();
      setData(res);
    } catch (e) {
      console.error('Failed to load dashboard metrics:', e);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-[#121927] border border-blue-500/30 p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Photoshop Automation Workspace</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              T-Shirt Print Studio Pro
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Place custom artwork into exact print zones on your master 2700×2643 px oversized T-shirt template, preserve native mockup layers & transparency, and export ready-to-print PSD files locally.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('generator')}
            className="self-start md:self-center px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center space-x-2.5 transition-all transform active:scale-95 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Design Generator</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Decorative ambient background blur */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Total PSD Exports
            </span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {data?.total_psd_generated ?? 0}
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center space-x-1 mt-1 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Full 8-bit RGBA</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Master Canvas
            </span>
            <span className="text-base font-bold font-mono text-white mt-1 block">
              2700 × 2643 px
            </span>
            <span className="text-[11px] text-blue-400 block mt-1">
              Calibrated from PSD
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Top Layout
            </span>
            <span className="text-sm font-bold text-white mt-1 block truncate max-w-[150px]">
              {data?.most_used_pattern || 'Small Front + Full Back'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Dual-side printing
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Warehouse Stock
            </span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {data?.total_inventory_units ?? 0}
            </span>
            <span className="text-[11px] text-amber-400 flex items-center space-x-1 mt-1 font-medium">
              <AlertTriangle className="w-3 h-3" />
              <span>{data?.low_stock_items_count ?? 0} SKUs low</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('generator')}
          className="bg-[#121927] border border-[#1e293d] hover:border-blue-500/50 rounded-xl p-5 cursor-pointer transition-all hover:shadow-xl group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
            1. Design Generator
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Pick garment, choose 1 of 15 patterns, upload front/back artwork, preview, and download layered PSDs.
          </p>
        </div>

        <div
          onClick={() => onNavigate('templates')}
          className="bg-[#121927] border border-[#1e293d] hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer transition-all hover:shadow-xl group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Sliders className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
            2. Template Calibration
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Visually drag and recalibrate Left Chest, Full Front, and Full Back print zones with live pixel coordinates.
          </p>
        </div>

        <div
          onClick={() => onNavigate('inventory')}
          className="bg-[#121927] border border-[#1e293d] hover:border-emerald-500/50 rounded-xl p-5 cursor-pointer transition-all hover:shadow-xl group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Package className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
            3. Stock & Inventory
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Track available blank garments across colors and sizes with instant +/- stock adjustments.
          </p>
        </div>
      </div>

      {/* Recent Production History */}
      {data && data.recent_jobs.length > 0 && (
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e293d]">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Recent Production Runs</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
            >
              <span>View All Runs</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-[#1e293d]">
            {data.recent_jobs.slice(0, 5).map((job) => (
              <div key={job.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-white block">{job.job_code}</span>
                  <span className="text-slate-400 text-[11px]">{job.pattern_name} • {job.color} {job.style}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-[11px] font-mono text-slate-400">{job.file_size_mb} MB</span>
                  <a
                    href={job.download_url}
                    download
                    className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 font-semibold flex items-center space-x-1 transition-all"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download PSD</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
