import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, Filter, Sparkles, Check, ArrowRight } from 'lucide-react';
import { ApiService } from '../../services/api';
import { Pattern } from '../../types';

interface PatternLibraryProps {
  onSelectPatternForDesign: (patternId: string) => void;
}

export const PatternLibrary: React.FC<PatternLibraryProps> = ({ onSelectPatternForDesign }) => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      const data = await ApiService.getPatterns();
      setPatterns(data);
    } catch (err) {
      console.error('Failed to load patterns:', err);
    }
  };

  const categories = ['All', 'Dual-Print', 'Front-Only', 'Back-Only', 'Custom'];

  const filteredPatterns = patterns.filter(p => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Pattern Library</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {patterns.length} Templates
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Browse, manage, and configure extensible print layout patterns and slot mappings.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
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

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search patterns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Patterns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatterns.map((p) => {
          const uploadsCount = p.required_uploads.length;
          return (
            <div
              key={p.pattern_id}
              className="bg-[#121927] border border-[#1e293d] hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                    {p.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {uploadsCount} {uploadsCount === 1 ? 'Artwork' : 'Artworks'} Req.
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                </div>

                {/* Slot Details */}
                <div className="bg-[#0e1422] rounded-lg p-2.5 space-y-1.5 text-[11px] border border-[#1e293d]">
                  {p.front_slots.length > 0 ? (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Front:</span>
                      <span className="font-mono text-blue-400">{p.front_slots[0].label || p.front_slots[0].zone_code}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Front:</span>
                      <span>Blank</span>
                    </div>
                  )}

                  {p.back_slots.length > 0 ? (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Back:</span>
                      <span className="font-mono text-indigo-400">{p.back_slots[0].label || p.back_slots[0].zone_code}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Back:</span>
                      <span>Blank</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => onSelectPatternForDesign(p.pattern_id)}
                className="mt-4 w-full py-2 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 hover:border-transparent text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
              >
                <span>Use in Design Generator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
