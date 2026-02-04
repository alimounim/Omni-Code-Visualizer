import React from 'react';
import { VariableValue, ActiveAccess, ControlFlow, EventLoopState } from '../types';
import ArrayVisualizer from './Visualizers/ArrayVisualizer';
import TreeVisualizer from './Visualizers/TreeVisualizer';
import DictionaryVisualizer from './Visualizers/DictionaryVisualizer';
import TableVisualizer from './Visualizers/TableVisualizer';
import StackVisualizer from './Visualizers/StackVisualizer';
import QueueVisualizer from './Visualizers/QueueVisualizer';
import MemoryVisualizer from './Visualizers/MemoryVisualizer';
import FlowVisualizer from './Visualizers/FlowVisualizer';
import MemoryGraphVisualizer from './Visualizers/MemoryGraphVisualizer';
import EventLoopVisualizer from './Visualizers/EventLoopVisualizer'; // New Component
import { Box } from 'lucide-react';

interface VisualizerCanvasProps {
  variables: Record<string, VariableValue>;
  language: string;
  scopeName?: string;
  activeAccess?: ActiveAccess;
  controlFlow?: ControlFlow;
  eventLoop?: EventLoopState; // Add Event Loop prop
}

const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ variables, language, scopeName, activeAccess, controlFlow, eventLoop }) => {
  
  const isGlobal = !scopeName || scopeName === 'global' || scopeName === 'main' || scopeName === '<module>';

  // Helper to determine best visualizer for a variable
  const renderVariable = (name: string, data: VariableValue) => {
    // 1. Explicit Stack/Queue Detection (from Gemini)
    if (data.type === 'stack') {
        return <StackVisualizer key={name} name={name} data={data} />;
    }
    if (data.type === 'queue') {
        return <QueueVisualizer key={name} name={name} data={data} />;
    }

    // 2. Detect Tree/Graph/LinkedList
    const isNode = data.type === 'tree_node' || data.type === 'linked_list_node' || (data.properties && (data.properties.left || data.properties.next));
    if (isNode) {
      return <TreeVisualizer key={name} name={name} data={data} />;
    }
    
    // 3. Detect Array (must be array value or explicity type array)
    if (Array.isArray(data.value) || data.type === 'array') {
      const items = Array.isArray(data.value) ? data.value : [];
      
      // Heuristic: It's a "Table" if it's a non-empty array of Objects.
      const isTable = items.length > 0 && items.every((it: any) => {
          if (typeof it !== 'object' || it === null) return false;
          if (Array.isArray(it)) return false;
          
          if ('type' in it) {
             if (it.type === 'primitive') return false;
             if (it.type === 'map' || it.type === 'object') return true;
          }

          const keys = Object.keys(it);
          const metadataKeys = new Set(['type', 'value', 'displayValue', 'address', 'targetAddress']);
          const isMetadataOnly = keys.every(k => metadataKeys.has(k));
          
          return !isMetadataOnly;
      });

      if (isTable) {
          return (
             <TableVisualizer 
                key={name}
                name={name}
                data={data}
                activeAccess={activeAccess}
             />
          );
      }

      return (
        <ArrayVisualizer 
            key={name} 
            name={name} 
            data={data} 
            activeAccess={activeAccess}
        />
      );
    }

    // 4. Detect Map / Dictionary / Object
    if (data.type === 'map' || data.type === 'object') {
       if (typeof data.value === 'object' && data.value !== null && !Array.isArray(data.value)) {
           return (
             <DictionaryVisualizer
                key={name}
                name={name}
                data={data}
                activeAccess={activeAccess}
             />
           );
       }
    }
    
    return null;
  };

  const primitives = (Object.entries(variables) as [string, VariableValue][]).filter(([_, v]) => {
    if (v.type === 'primitive') return true;
    if (v.type === 'pointer') return false;
    
    const isArray = Array.isArray(v.value) || v.type === 'array';
    const isNode = v.type === 'tree_node' || v.type === 'linked_list_node' || (v.properties && (v.properties.left || v.properties.next));
    const isMap = v.type === 'map' || (v.type === 'object' && typeof v.value === 'object' && v.value !== null);
    const isStackOrQueue = v.type === 'stack' || v.type === 'queue';

    return !isArray && !isNode && !isMap && !isStackOrQueue;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full relative">
      
      {/* Main Visualization Stage (2/3 width) */}
      <div className={`lg:col-span-2 flex flex-col gap-4 overflow-y-auto pr-2 pb-10 transition-colors duration-500 ${!isGlobal ? 'bg-slate-900/30 rounded-xl border border-dashed border-indigo-500/30 p-4' : ''}`}>
        
        {controlFlow && (
             <div className="w-full max-w-lg mx-auto mb-2 sticky top-0 z-10">
                <FlowVisualizer flow={controlFlow} />
             </div>
        )}

        {!isGlobal && (
            <div className="flex items-center gap-2 text-indigo-300 bg-indigo-900/20 px-3 py-2 rounded-md w-fit mb-2 border border-indigo-500/40">
                <Box size={16} />
                <span className="text-sm font-bold">Scope: {scopeName}</span>
            </div>
        )}
        
        {/* --- JS SPECIAL EVENT LOOP MODE --- */}
        {language === 'javascript' && (
             <EventLoopVisualizer state={eventLoop} />
        )}

        {isGlobal && <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Data Structures (Global)</h2>}

        {/* --- C++ SPECIAL MEMORY MODE --- */}
        {language === 'cpp' ? (
             <MemoryGraphVisualizer variables={variables} activeAccess={activeAccess} />
        ) : (
            /* --- STANDARD MODE --- */
            <>
                {(Object.entries(variables) as [string, VariableValue][]).map(([name, data]) => renderVariable(name, data))}
                
                {Object.keys(variables).length === 0 && !eventLoop && (
                    <div className="h-24 flex items-center justify-center text-slate-600 border border-slate-800 border-dashed rounded-lg text-sm italic">
                        No variables or visualization data available.
                    </div>
                )}
            </>
        )}
      </div>

      {/* Side Panel: Primitives & Memory (1/3 width) */}
      <div className="flex flex-col gap-4 h-full overflow-hidden">
        
        {/* Primitives Scope */}
        <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 max-h-[40%] overflow-y-auto relative">
             <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Scope Variables</h3>
             <ul className="space-y-2">
                {primitives.map(([name, v]) => {
                    const isActiveIndex = activeAccess?.indexVar === name;
                    return (
                        <li key={name} className={`flex justify-between items-center text-sm font-mono border-b border-slate-800/50 pb-1 last:border-0 transition-colors ${isActiveIndex ? 'bg-yellow-900/20 -mx-2 px-2 rounded' : ''}`}>
                            <span className={isActiveIndex ? 'text-yellow-400 font-bold' : 'text-pink-400'}>
                                {name} {isActiveIndex && ' (index)'}
                            </span>
                            <span className="text-slate-300">{String(v.displayValue || v.value)}</span>
                        </li>
                    );
                })}
                {primitives.length === 0 && <li className="text-slate-600 text-xs italic">No primitives</li>}
             </ul>
        </div>

        {/* Memory Map (Remaining Height) */}
        <div className="flex-1 overflow-hidden">
             <MemoryVisualizer variables={variables} />
        </div>
      </div>
    </div>
  );
};

export default VisualizerCanvas;