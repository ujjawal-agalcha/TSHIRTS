import React from 'react';
import { 
  Sparkles, 
  Layers, 
  Sliders, 
  Package, 
  BarChart3, 
  Database, 
  Bot, 
  Settings, 
  LayoutDashboard,
  CheckCircle2,
  Cpu
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  serverStatus: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, serverStatus }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'generator', label: 'Design Generator', icon: Sparkles, badge: 'Core' },
    { id: 'patterns', label: 'Pattern Library', icon: Layers },
    { id: 'templates', label: 'Template Editor', icon: Sliders, badge: 'Calibrate' },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'master_data', label: 'Master Data', icon: Database },
    { id: 'ai_assistant', label: 'AI Assistant', icon: Bot, badge: 'Local' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0e1422] border-r border-[#1e293d] flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1e293d] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight leading-none">PRINTSTUDIO</h1>
            <p className="text-[11px] text-blue-400 font-medium tracking-wider uppercase mt-1">PSD Engine Pro</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
          Studio Workflow
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#162032]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-blue-400 border border-blue-500/20'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-[#1e293d] bg-[#0b0f17]">
        <div className="bg-[#121927] rounded-lg p-3 border border-[#1e293d] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>Local Engine</span>
            </span>
            <span className="flex items-center space-x-1 text-emerald-400 font-medium text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{serverStatus ? 'Online' : 'Connecting'}</span>
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-[#1e293d]">
            <span>PSD Canvas:</span>
            <span className="text-slate-200 font-mono">2700 × 2643 px</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
