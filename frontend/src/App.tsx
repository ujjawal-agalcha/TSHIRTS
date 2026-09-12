import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { DesignGenerator } from './components/generator/DesignGenerator';
import { PatternLibrary } from './components/patterns/PatternLibrary';
import { TemplateEditor } from './components/template_editor/TemplateEditor';
import { InventoryModule } from './components/inventory/InventoryModule';
import { AnalyticsModule } from './components/analytics/AnalyticsModule';
import { MasterDataModule } from './components/master_data/MasterDataModule';
import { AiAssistantModule } from './components/ai_assistant/AiAssistantModule';
import { SettingsModule } from './components/settings/SettingsModule';
import { ApiService } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('generator'); // default to core generator module
  const [serverStatus, setServerStatus] = useState<boolean>(false);

  useEffect(() => {
    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkServer = async () => {
    try {
      const res = await ApiService.getHealth();
      setServerStatus(res.status === 'ok');
    } catch {
      setServerStatus(false);
    }
  };

  const handleSelectPatternForDesign = (patternId: string) => {
    setCurrentTab('generator');
  };

  return (
    <div className="flex h-screen bg-[#0b0f17] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        serverStatus={serverStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {currentTab === 'dashboard' && <Dashboard onNavigate={setCurrentTab} />}
        {currentTab === 'generator' && <DesignGenerator />}
        {currentTab === 'patterns' && <PatternLibrary onSelectPatternForDesign={handleSelectPatternForDesign} />}
        {currentTab === 'templates' && <TemplateEditor />}
        {currentTab === 'inventory' && <InventoryModule />}
        {currentTab === 'analytics' && <AnalyticsModule />}
        {currentTab === 'master_data' && <MasterDataModule />}
        {currentTab === 'ai_assistant' && <AiAssistantModule onNavigate={setCurrentTab} />}
        {currentTab === 'settings' && <SettingsModule />}
      </main>
    </div>
  );
}

export default App;
