import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { VariableValue, ActiveAccess } from '../../types';
import { Tag, ChevronDown, ChevronUp } from 'lucide-react';

interface DictionaryVisualizerProps {
  name?: string;
  data: VariableValue | any;
  activeAccess?: ActiveAccess;
  depth?: number;
}

const DictionaryVisualizer: React.FC<DictionaryVisualizerProps> = ({ name, data, activeAccess, depth = 0 }) => {
  const [showAll, setShowAll] = useState(false);

  // Data Normalization Logic
  let entries: [string, any][] = [];
  
  // Try to find the actual key-value pairs
  if (data) {
      if (typeof data === 'object') {
          // 1. Trace VariableValue with 'properties' (standard for objects/nodes)
          if ('properties' in data && data.properties) {
               entries = Object.entries(data.properties);
          }
          // 2. Trace VariableValue with 'value' as object (Map)
          else if ('value' in data && typeof data.value === 'object' && data.value !== null && !Array.isArray(data.value)) {
               entries = Object.entries(data.value);
          }
          // 3. Raw object (nested recursion case)
          else if (!('type' in data) && !('value' in data)) {
               entries = Object.entries(data);
          }
           // 4. Trace VariableValue with 'value' as object but maybe wrapped in type (fallback)
          else if ('value' in data && typeof data.value === 'object') {
              entries = Object.entries(data.value);
          }
      }
  }

  const isTarget = name && activeAccess?.target === name;
  const targetKey = isTarget ? String(activeAccess?.index) : null;

  const LIMIT = 10;
  const visibleEntries = showAll ? entries : entries.slice(0, LIMIT);
  const hasMore = entries.length > LIMIT;

  // Recursive Renderer for Cell Content
  const RenderValue = ({ val }: { val: any }) => {
      let content = val;
      let isPrimitive = false;

      // Unwrap VariableValue if present
      if (val && typeof val === 'object') {
          if ('value' in val && 'type' in val) {
              content = val.value;
              if (val.type === 'primitive') isPrimitive = true;
          }
      }

      if (content === null || content === undefined) return <span className="text-slate-500 italic">null</span>;

      // Primitive Display
      if (isPrimitive || typeof content !== 'object') {
          const s = String(content);
          const isStr = typeof content === 'string' || (typeof val === 'object' && val?.type === 'string'); // loose check
           // Heuristic for coloring
           const color = !isNaN(Number(content)) ? 'text-blue-300' : (content === 'true' || content === 'false' || typeof content === 'boolean') ? 'text-pink-400' : 'text-orange-300';
           return <span className={`font-mono ${color}`}>{isStr && isNaN(Number(content)) && content !== 'true' && content !== 'false' ? `"${s}"` : s}</span>;
      }

      // Array Display
      if (Array.isArray(content)) {
          if (content.length === 0) return <span className="text-slate-500">[]</span>;
          return (
              <div className="flex flex-col gap-1 my-1 border-l-2 border-slate-700 pl-2">
                  {content.map((item, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                          <span className="text-slate-600 font-mono select-none">[{i}]</span>
                          <RenderValue val={item} />
                      </div>
                  ))}
              </div>
          );
      }

      // Recursive Object Display
      // Determine if empty
      if (Object.keys(content).length === 0) return <span className="text-slate-500">{'{ }'}</span>;

      return (
          <div className="my-1">
              <DictionaryVisualizer data={content} depth={depth + 1} activeAccess={activeAccess} />
          </div>
      );
  };

  // --- Render for Nested Level (Table Only) ---
  if (!name && depth > 0) {
      return (
          <div className="w-full bg-slate-900/30 rounded border border-slate-700/50 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                  <tbody>
                      {visibleEntries.map(([k, v], i) => (
                          <tr key={k} className={`border-b border-slate-700/50 last:border-0 ${i % 2 === 1 ? 'bg-slate-800/30' : ''}`}>
                              <td className="py-1.5 px-2 font-semibold text-slate-400 border-r border-slate-700/50 align-top w-min whitespace-nowrap">{k}</td>
                              <td className="py-1.5 px-2 text-slate-300 align-top">
                                  <RenderValue val={v} />
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
              {hasMore && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowAll(!showAll); }}
                    className="w-full text-center text-[10px] text-slate-500 hover:text-slate-300 py-1 bg-slate-800/50 hover:bg-slate-700 transition-colors"
                >
                    {showAll ? 'Show Less' : `Show ${entries.length - LIMIT} More...`}
                </button>
            )}
          </div>
      );
  }

  // --- Render for Root Level (Container) ---
  return (
    <div className={`rounded-xl border backdrop-blur-md overflow-hidden transition-all duration-300 ${isTarget ? 'bg-slate-800/80 border-purple-500 shadow-xl shadow-purple-900/20' : 'bg-slate-800/40 border-slate-700'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-700/50 bg-slate-900/20">
            <div className="flex items-center gap-2">
                <Tag size={14} className={isTarget ? 'text-purple-400' : 'text-slate-500'} />
                <span className={`text-sm font-bold font-mono ${isTarget ? 'text-purple-300' : 'text-slate-400'}`}>{name}</span>
                <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">Map</span>
            </div>
            <div className="flex items-center gap-2">
                {data.address && <span className="text-xs text-slate-600 font-mono">{data.address}</span>}
                <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 rounded-full">{entries.length}</span>
            </div>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-mono border-collapse min-w-full">
                <thead>
                    <tr className="bg-slate-900/50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-700">
                        <th className="py-2 px-4 font-semibold w-1/4 min-w-[100px]">Key</th>
                        <th className="py-2 px-4 font-semibold">Value</th>
                    </tr>
                </thead>
                <tbody>
                    {visibleEntries.map(([key, value], idx) => {
                         const isRowAccessed = String(key) === targetKey;
                         return (
                             <motion.tr 
                                key={key}
                                initial={false}
                                animate={{
                                    backgroundColor: isRowAccessed ? 'rgba(168, 85, 247, 0.15)' : (idx % 2 === 1 ? 'rgba(15, 23, 42, 0.3)' : 'transparent')
                                }}
                                className={`border-b border-slate-700/30 last:border-0 hover:bg-slate-800/40 transition-colors group ${isRowAccessed ? 'ring-1 ring-inset ring-purple-500/50' : ''}`}
                             >
                                <td className="py-2 px-4 font-bold text-slate-300 align-top border-r border-slate-700/30">
                                    <div className="flex items-center gap-2">
                                        {key}
                                        {isRowAccessed && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />}
                                    </div>
                                </td>
                                <td className="py-2 px-4 align-top text-slate-300">
                                    <RenderValue val={value} />
                                </td>
                             </motion.tr>
                         );
                    })}
                </tbody>
            </table>
        </div>

        {/* Empty State */}
        {entries.length === 0 && (
            <div className="p-6 text-center text-slate-600 italic text-sm">Empty Dictionary</div>
        )}

        {/* Expand/Collapse Footer */}
        {hasMore && (
            <button 
                onClick={() => setShowAll(!showAll)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors border-t border-slate-700/30 flex items-center justify-center gap-1"
            >
                {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showAll ? 'Show Less' : `Show ${entries.length - LIMIT} More Items`}
            </button>
        )}
    </div>
  );
};

export default DictionaryVisualizer;