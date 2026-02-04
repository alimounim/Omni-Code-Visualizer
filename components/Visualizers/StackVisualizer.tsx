import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VariableValue } from '../../types';
import { Layers } from 'lucide-react';

interface StackVisualizerProps {
  name: string;
  data: VariableValue;
}

const StackVisualizer: React.FC<StackVisualizerProps> = ({ name, data }) => {
  // Robust data extraction: 
  // 1. If value is direct array, use it.
  // 2. If value is object/wrapper (like 'self'), look for array property.
  let items: any[] = [];
  
  if (Array.isArray(data.value)) {
    items = data.value;
  } else if (data.properties) {
    // Look for common property names holding data, or just the first array found
    const candidates = Object.values(data.properties) as any[];
    const arrayProp = candidates.find(p => p.type === 'array' || Array.isArray(p.value));
    
    if (arrayProp && Array.isArray(arrayProp.value)) {
        items = arrayProp.value;
    } else {
        // Fallback: If no array property found, maybe the value itself is the list wrapped
        if (data.value && typeof data.value === 'object' && Array.isArray((data.value as any).value)) {
             items = (data.value as any).value;
        }
    }
  }

  return (
    <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40 backdrop-blur-md flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-4 border-b border-slate-700/50 pb-2">
        <div className="flex items-center gap-2">
            <Layers size={14} className="text-orange-400" />
            <span className="text-sm font-bold font-mono text-orange-300">{name}</span>
            <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">Stack (LIFO)</span>
        </div>
        <span className="text-xs text-slate-600 font-mono">{data.address}</span>
      </div>

      {/* Stack Container: U-Shape */}
      <div className="relative pt-6 px-4 pb-0 min-h-[200px] w-48 flex flex-col-reverse justify-start items-center gap-1 border-b-4 border-l-4 border-r-4 border-slate-600 rounded-b-xl bg-slate-900/20 shadow-inner">
        
        {/* Top Pointer Indicator */}
        {items.length > 0 && (
            <motion.div 
                layoutId={`top-pointer-${name}`}
                className="absolute -right-16 top-10 flex items-center gap-2 text-orange-500 text-xs font-mono font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, top: 200 - (items.length * 36) }} // Rough calculation for visual pointer
                transition={{ type: "spring", stiffness: 100 }}
            >
                <span className="uppercase">Top</span>
                <div className="w-4 h-px bg-orange-500"></div>
            </motion.div>
        )}

        <AnimatePresence mode='popLayout'>
            {items.map((item: any, index: number) => {
                 let content = item;
                 if (typeof item === 'object' && item !== null) {
                     content = item.displayValue || (Array.isArray(item) ? '[...]' : '{...}');
                 }

                 return (
                    <motion.div
                        key={`${index}-${String(content)}`}
                        initial={{ opacity: 0, y: -50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.5, transition: { duration: 0.2 } }}
                        className="w-full h-8 flex items-center justify-center bg-orange-600/20 border border-orange-500/50 rounded text-orange-200 text-xs font-mono shadow-sm relative group"
                    >
                        <span className="z-10 truncate px-2">{String(content)}</span>
                        <span className="absolute left-2 text-[8px] text-orange-500/50 group-hover:opacity-100 opacity-0 transition-opacity">#{index}</span>
                    </motion.div>
                 );
            })}
        </AnimatePresence>
        
        {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs italic">
                Empty Stack
            </div>
        )}
      </div>
      <div className="mt-2 text-[10px] text-slate-500 font-mono uppercase tracking-widest">Base</div>
    </div>
  );
};

export default StackVisualizer;