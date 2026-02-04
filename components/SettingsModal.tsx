
import React, { useState, useEffect } from 'react';
import { X, Key, Save, ExternalLink, ShieldCheck, Trash2 } from 'lucide-react';
import { getApiKey, setStoredApiKey, removeStoredApiKey, STORAGE_KEY } from '../utils/apiKey';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [key, setKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
        const current = localStorage.getItem(STORAGE_KEY) || '';
        setKey(current);
        setIsSaved(!!current);
    }
  }, [isOpen]);

  const handleSave = () => {
      if (!key.trim()) return;
      setStoredApiKey(key.trim());
      setIsSaved(true);
      onClose();
      // Reload to ensure all services pick up the new key immediately if they cached it
      window.location.reload();
  };

  const handleClear = () => {
      removeStoredApiKey();
      setKey('');
      setIsSaved(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-lg">
            <Key size={20} />
            <span>API Settings</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6">
          
          <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
              <h3 className="text-blue-200 font-bold mb-1 flex items-center gap-2">
                  <ShieldCheck size={16} /> Bring Your Own Key
              </h3>
              <p className="text-sm text-blue-300/80 leading-relaxed">
                  This application requires a Google Gemini API Key to function. 
                  Your key is stored locally in your browser and is never sent to any server other than Google's API.
              </p>
          </div>

          <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300">Gemini API Key</label>
              <div className="relative">
                <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
                  >
                      Get a free API key here <ExternalLink size={10} />
                  </a>
                  {isSaved && (
                      <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                          <Trash2 size={10} /> Clear saved key
                      </button>
                  )}
              </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Save size={16} />
            <span>Save & Reload</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
