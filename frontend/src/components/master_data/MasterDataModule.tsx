import React, { useState, useEffect } from 'react';
import { Database, Check, Palette, Shirt, Ruler, Truck, Package } from 'lucide-react';
import { ApiService } from '../../services/api';

export const MasterDataModule: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await ApiService.getMasterData();
      setData(res);
    } catch (err) {
      console.error('Failed to load master data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!data) return <div className="p-6 text-slate-400">Loading master data records...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <span>Master Data Registry</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            System Taxonomy
          </span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Manage core studio master entities including garment colors, cut styles, size scales, and suppliers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Colors */}
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e293d]">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Palette className="w-4 h-4 text-blue-400" />
              <span>Garment Colors</span>
            </h3>
            <span className="text-xs text-slate-400">{data.colors.length} Defined</span>
          </div>

          <div className="divide-y divide-[#1e293d]">
            {data.colors.map((c: any) => (
              <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div
                    style={{ backgroundColor: c.hex }}
                    className="w-5 h-5 rounded-full border border-slate-600 shadow-inner"
                  />
                  <span className="font-semibold text-white">{c.name}</span>
                </div>
                <span className="font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                  {c.code}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Styles */}
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e293d]">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Shirt className="w-4 h-4 text-indigo-400" />
              <span>Garment Silhouette Styles</span>
            </h3>
            <span className="text-xs text-slate-400">{data.styles.length} Defined</span>
          </div>

          <div className="divide-y divide-[#1e293d]">
            {data.styles.map((s: any) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white block">{s.name}</span>
                  <span className="text-[11px] text-slate-400">{s.description || 'Standard fit'}</span>
                </div>
                <span className="font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                  {s.code}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Size Scale */}
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e293d]">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Ruler className="w-4 h-4 text-purple-400" />
              <span>Standard Size Scale</span>
            </h3>
            <span className="text-xs text-slate-400">{data.sizes.length} Sizes</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {data.sizes.map((sz: any) => (
              <div
                key={sz.id}
                className="px-3.5 py-2 rounded-lg bg-[#0e1422] border border-[#1e293d] text-center"
              >
                <span className="font-bold text-sm text-white block">{sz.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">Tier {sz.sort_order}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Suppliers */}
        <div className="bg-[#121927] border border-[#1e293d] rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e293d]">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Garment Suppliers</span>
            </h3>
            <span className="text-xs text-slate-400">{data.suppliers.length} Active</span>
          </div>

          <div className="divide-y divide-[#1e293d]">
            {data.suppliers.map((sp: any) => (
              <div key={sp.id} className="py-2.5 text-xs space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white">{sp.name}</span>
                  <span className="text-[11px] text-slate-400">{sp.contact}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {sp.email}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
