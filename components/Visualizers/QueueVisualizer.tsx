import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VariableValue } from '../../types';
import { GalleryHorizontalEnd } from 'lucide-react';

interface QueueVisualizerProps {
  name: string;
  data: VariableValue;
}

const QueueVisualizer: React.FC<QueueVisualizerProps> = ({ name, data }) => {
  // Robust data extraction: 
  let items: any[] = [];
  
  if (Array.isArray(data.value)) {
    items = data.value;
  } else if (data.properties) {
    const candidates = Object.values(data.properties) as any[];
    const arrayProp = candidates.find(p => p.type === 'array' || Array.isArray(p.value));
    
    if (arrayProp && Array.isArray(arrayProp.value)) {
        items = arrayProp.value;
    }
  }

  return (
    <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40 backdrop-blur-md">
      <div className="flex items-center justify-between w-full mb-4 border-b border-slate-700/50 pb-2">
        <div className="flex items-center gap-2">
            <GalleryHorizontalEnd size={14} className="text-teal-400" />
            <span className="text-sm font-bold font-mono text-teal-300">{name}</span>
            <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">Queue (FIFO)</span>
        </div>
        <span className="text-xs text-slate-600 font-mono">{data.address}</span>
      </div>

      {/* Queue Container: Pipe Shape */}
      <div className="relative py-4 px-8 min-h-[100px] w-full flex items-center justify-center bg-slate-900/20 rounded-lg overflow-hidden">
        
        {/* Pipe Borders */}
        <div className="absolute top-2 left-0 right-0 h-0.5 bg-slate-600 border-t border-dashed border-slate-500/50 opacity-50"></div>
        <div className="absolute bottom-2 left-0 right-0 h-0.5 bg-slate-600 border-b border-dashed border-slate-500/50 opacity-50"></div>
        
        {/* Direction Indicators */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-teal-500/70 rotate-180 writing-mode-vertical">OUT (Front)</div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-teal-500/70 writing-mode-vertical">IN (Rear)</div>

        <div className="flex items-center gap-2 overflow-x-auto w-full px-6 py-2 scrollbar-thin scrollbar-thumb-teal-900 scrollbar-track-transparent justify-start">
            <AnimatePresence mode='popLayout'>
                {items.map((item: any, index: number) => {
                    let content = item;
                    if (typeof item === 'object' && item !== null) {
                        content = item.displayValue || (Array.isArray(item) ? '[...]' : '{...}');
                    }

                    return (
                        <motion.div
                            key={`${index}-${String(content)}`}
                            layout
                            initial={{ opacity: 0, x: 50, scale: 0.8 }} // Enter from right
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -50, scale: 0.5 }} // Exit to left
                            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                            className="min-w-[3rem] h-12 flex flex-col items-center justify-center bg-teal-900/30 border border-teal-500/40 rounded text-teal-200 text-xs font-mono shadow-sm relative"
                        >
                            <span className="z-10 truncate max-w-[5rem] px-1">{String(content)}</span>
                            {index === 0 && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-bold text-teal-400 uppercase tracking-tighter">Front</span>
                            )}
                            {index === items.length - 1 && items.length > 1 && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Rear</span>
                            )}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
             {items.length === 0 && (
                <div className="w-full text-center text-slate-600 text-xs italic">
                    Empty Queue
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default QueueVisualizer;