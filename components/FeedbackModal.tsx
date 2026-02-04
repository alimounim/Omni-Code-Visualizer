import React, { useState } from 'react';
import { X, MessageSquareWarning, Sparkles } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: string) => void;
  isFixing: boolean;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, isFixing }) => {
  const [feedback, setFeedback] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-2 text-orange-400 font-semibold">
            <MessageSquareWarning size={18} />
            <span>Refine Visualization</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm text-slate-400">
            Is the logic wrong? Is a variable missing? Describe the issue, and the AI will attempt to self-correct the execution trace.
          </p>
          
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="E.g., The 'root' variable should be visualized as a Tree, but it's showing as an Object..."
            className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(feedback)}
            disabled={!feedback.trim() || isFixing}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isFixing ? (
                <>
                    <Sparkles size={16} className="animate-spin" />
                    <span>Applying Fix...</span>
                </>
            ) : (
                <>
                    <Sparkles size={16} />
                    <span>Auto-Fix</span>
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;