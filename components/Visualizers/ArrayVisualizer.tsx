import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VariableValue, ActiveAccess } from '../../types';
import { CornerDownRight } from 'lucide-react';

interface ArrayVisualizerProps {
  name: string;
  data: VariableValue;
  activeAccess?: ActiveAccess;
}

const ArrayVisualizer: React.FC<ArrayVisualizerProps> = ({ name, data, activeAccess }) => {
  // Normalize value to array
  const items = Array.isArray(data.value) ? data.value : [];
  
  // Check if this array is the target of the current active access
  const isTarget = activeAccess?.target === name;
  const targetIndex = isTarget && activeAccess?.index !== undefined ? Number(activeAccess.index) : -1;

  return (
    <div className={`p-4 rounded-lg border backdrop-blur-sm transition-all duration-300 ${isTarget ? 'bg-slate-800 border-blue-500 shadow-lg shadow-blue-900/20' : 'bg-slate-800/50 border-slate-700'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-semibold font-mono ${isTarget ? 'text-blue-300' : 'text-slate-400'}`}>{name}</span>
        <span className="text-xs text-slate-500 font-mono">{data.address}</span>
      </div>
      
      {/* Container with increased top padding to make room for index pointers */}
      <div className="flex flex-wrap gap-2 items-end pt-8 px-1">
        <AnimatePresence>
          {items.map((item: any, index: number) => {
            const isAccessed = index === targetIndex;
            
            // Determine display text
            let content = item;
            if (typeof item === 'object' && item !== null) {
                content = item.displayValue || (Array.isArray(item) ? '[...]' : '{...}');
            }
            
            return (
                <div key={`${name}-${index}`} className="flex flex-col items-center gap-1 relative">
                    
                    {/* Logical Path Indicator (The "Physical Link") */}
                    {isAccessed && activeAccess?.indexVar && (
                        <motion.div 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute -top-9 flex flex-col items-center text-yellow-400 z-10"
                        >
                            <span className="text-[10px] font-mono bg-yellow-900/80 px-1.5 py-0.5 rounded border border-yellow-700 shadow-sm whitespace-nowrap">{activeAccess.indexVar}</span>
                            <div className="w-px h-2 bg-yellow-500"></div>
                            <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-yellow-500"></div>
                        </motion.div>
                    )}

                    <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                        opacity: 1, 
                        scale: isAccessed ? 1.1 : 1,
                        borderColor: isAccessed ? '#eab308' : '#475569', // Yellow-500 vs Slate-600
                        backgroundColor: isAccessed ? 'rgba(234, 179, 8, 0.1)' : '#0f172a'
                    }}
                    transition={{ duration: 0.2 }}
                    className={`min-w-[3rem] w-auto min-h-[3rem] px-3 py-1 flex items-center justify-center border-2 rounded text-slate-200 font-mono shadow-md relative whitespace-nowrap`}
                    >
                        <span className="z-10 text-xs font-medium">{String(content)}</span>
                    </motion.div>
                    
                    <span className={`text-[10px] font-mono ${isAccessed ? 'text-yellow-500 font-bold' : 'text-slate-600'}`}>
                        {index}
                    </span>
                </div>
            );
          })}
        </AnimatePresence>
        {items.length === 0 && (
            <span className="text-slate-600 italic text-sm -mt-6">Empty Collection</span>
        )}
      </div>
    </div>
  );
};

export default ArrayVisualizer;