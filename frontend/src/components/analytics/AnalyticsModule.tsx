import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Sparkles, 
  Download, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  Layers, 
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { ApiService } from '../../services/api';
import { AnalyticsData } from '../../types';

export const AnalyticsModule: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await ApiService.getAnalytics();
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!data) {
    return <div className="p-6 text-slate-400">Loading analytics metrics...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <span>Studio Analytics & Insights</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Real-time Telemetry
          </span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Monitor design generation volume, most popular patterns, production output, and warehouse stock velocity.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total PSDs */}
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Generated PSDs
            </span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {data.total_psd_generated}
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center space-x-1 mt-1 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>100% layered exports</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Top Pattern */}
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Top Pattern
            </span>
            <span className="text-base font-bold text-white mt-1 block truncate max-w-[170px]" title={data.most_used_pattern}>
              {data.most_used_pattern}
            </span>
            <span className="text-[11px] text-blue-400 block mt-1 font-medium">
              Highest print volume
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Most Used Color & Style */}
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Garment Leader
            </span>
            <span className="text-base font-bold text-white mt-1 block">
              {data.most_used_color} • {data.most_used_style}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Top customer preference
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Inventory Stock Units */}
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Blank Garment Units
            </span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {data.total_inventory_units}
            </span>
            <span className="text-[11px] text-amber-400 flex items-center space-x-1 mt-1 font-medium">
              <AlertTriangle className="w-3 h-3" />
              <span>{data.low_stock_items_count} SKUs low stock</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Breakdown Visuals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pattern Popularity */}
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Pattern Production Distribution</span>
          </h3>

          <div className="space-y-2 pt-1">
            {data.pattern_distribution.length > 0 ? (
              data.pattern_distribution.map((p, idx) => {
                const pct = Math.max(10, Math.min(100, Math.round((p.count / (data.total_designs || 1)) * 100)));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>{p.name}</span>
                      <span className="font-mono text-blue-400">{p.count} runs</span>
                    </div>
                    <div className="w-full bg-[#0e1422] h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center">
                Generate designs to populate pattern analytics.
              </div>
            )}
          </div>
        </div>

        {/* Color Share */}
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span>Garment Color Share</span>
          </h3>

          <div className="space-y-2 pt-1">
            {data.color_distribution.length > 0 ? (
              data.color_distribution.map((c, idx) => {
                const pct = Math.max(10, Math.min(100, Math.round((c.count / (data.total_designs || 1)) * 100)));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>{c.name} T-Shirt</span>
                      <span className="font-mono text-purple-400">{c.count} designs</span>
                    </div>
                    <div className="w-full bg-[#0e1422] h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="bg-gradient-to-r from-purple-600 to-pink-500 h-full rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center">
                Generate designs to view garment color share.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Generated Jobs Table */}
      <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-[#1e293d]">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>Recent Photoshop Generation Jobs</span>
          </h3>
          <span className="text-xs text-slate-400">{data.recent_jobs.length} Recent Outputs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e293d] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Job Code</th>
                <th className="py-2.5 px-3">Pattern</th>
                <th className="py-2.5 px-3">Garment</th>
                <th className="py-2.5 px-3">File Size</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293d] text-xs">
              {data.recent_jobs.map((job) => (
                <tr key={job.id} className="hover:bg-[#162032] transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-white">
                    {job.job_code}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {job.pattern_name}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {job.color} • {job.style}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {job.file_size_mb} MB
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {job.created_at}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <a
                      href={job.download_url}
                      download
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-[11px] font-semibold transition-all"
                    >
                      <Download className="w-3 h-3" />
                      <span>PSD</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
