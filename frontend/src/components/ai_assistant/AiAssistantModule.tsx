import React, { useState } from 'react';
import { Bot, Send, User, Sparkles, HelpCircle, ArrowRight, CornerDownLeft } from 'lucide-react';
import { ApiService } from '../../services/api';
import { ChatMessage } from '../../types';

interface AiAssistantProps {
  onNavigate: (tab: string) => void;
}

export const AiAssistantModule: React.FC<AiAssistantProps> = ({ onNavigate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "👋 Hello! I am your **T-Shirt Print Studio AI Assistant**.\n\nI run locally on your server and can instantly query your SQLite database for:\n- 📦 Blank garment inventory & stock quantities\n- ⚠️ Low-stock warnings and reorder thresholds\n- 🎨 Supported print patterns & dual-side printing\n- 📐 Master canvas & print zone calibration coordinates\n- 📊 Production analytics & workflow guidance\n\nHow can I help you today?",
      suggested_actions: [
        "How many black oversized L T-shirts do I have?",
        "Which patterns support front and back printing?",
        "Show low stock items",
        "Show me available print zones"
      ]
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await ApiService.chat(text, messages);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.reply,
        suggested_actions: res.suggested_actions || []
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error connecting to the local database assistant.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: string) => {
    if (action.includes('Inventory')) {
      onNavigate('inventory');
    } else if (action.includes('Generator') || action.includes('Design')) {
      onNavigate('generator');
    } else if (action.includes('Template') || action.includes('Calibrate')) {
      onNavigate('templates');
    } else if (action.includes('Analytics')) {
      onNavigate('analytics');
    } else if (action.includes('Pattern')) {
      onNavigate('patterns');
    } else {
      handleSendMessage(action);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1e293d] shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Bot className="w-6 h-6 text-blue-400" />
            <span>Studio AI Assistant</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Local DB Engine Active
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Instant deterministic intelligence over your warehouse inventory, print zones, and studio jobs.
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-blue-600/20'
                    : 'bg-[#121927] border border-[#1e293d] text-slate-200 rounded-tl-none shadow-md'
                }`}
              >
                <div className="whitespace-pre-line prose prose-invert text-xs sm:text-sm">
                  {msg.content}
                </div>

                {/* Suggested Action Chips */}
                {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#1e293d]/80 flex flex-wrap gap-1.5">
                    {msg.suggested_actions.map((act, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => handleActionClick(act)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-[#0e1422] hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 transition-all flex items-center space-x-1 font-medium"
                      >
                        <span>{act}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-1">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="bg-[#121927] border border-[#1e293d] rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span>Querying local database...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="pt-3 border-t border-[#1e293d] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2 bg-[#121927] border border-[#1e293d] rounded-xl p-2 focus-within:border-blue-500 transition-colors shadow-lg"
        >
          <input
            type="text"
            placeholder="Ask about inventory, patterns, template calibration, or jobs..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-blue-600/30 disabled:opacity-40"
          >
            <span>Ask</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
