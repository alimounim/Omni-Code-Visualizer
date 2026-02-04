import React from 'react';
import { motion } from 'framer-motion';
import { ControlFlow } from '../../types';
import { GitGraph, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

interface FlowVisualizerProps {
  flow: ControlFlow;
}

const FlowVisualizer: React.FC<FlowVisualizerProps> = ({ flow }) => {
  // Normalize checking for truthy value to handle "True", "true", or boolean true safely
  const isTrue = String(flow.result).toLowerCase() === 'true';
  
  return (
    <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 bg-slate-900/80 border border-slate-600 rounded-lg p-3 flex flex-col items-center shadow-xl backdrop-blur relative overflow-hidden"
    >
        {/* Background Accent */}
        <div className={`absolute top-0 left-0 w-1 h-full ${isTrue ? 'bg-green-500' : 'bg-orange-500'}`} />

        <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 w-full pl-2">
            <GitGraph size={14} /> Logic Flow
        </div>

        <div className="flex items-center gap-4 w-full justify-center pl-2">
            {/* Decision Diamond Representation */}
            <div className="bg-slate-800 border border-slate-500 px-4 py-2 rounded-md transform rotate-0 skew-x-0 relative group min-w-[120px] text-center">
                <span className="font-mono text-sm text-blue-200 font-semibold">{flow.condition || 'Decision'}</span>
                <div className="text-[9px] text-slate-500 mt-1 uppercase">{flow.type}</div>
            </div>

            <ArrowRight size={20} className="text-slate-500" />

            {/* Result Box */}
            <div className={`px-3 py-1.5 rounded flex items-center gap-2 border ${isTrue ? 'bg-green-900/30 border-green-700 text-green-300' : 'bg-orange-900/30 border-orange-700 text-orange-300'}`}>
                {isTrue ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span className="font-bold text-sm">{String(flow.result)}</span>
            </div>
        </div>
        
        {flow.description && (
            <div className="mt-3 text-xs text-slate-400 italic border-t border-slate-800 pt-2 w-full text-center">
                "{flow.description}"
            </div>
        )}
    </motion.div>
  );
};

export default FlowVisualizer;