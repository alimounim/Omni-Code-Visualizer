import React from 'react';
import { motion } from 'framer-motion';
import { VariableValue, ActiveAccess } from '../../types';
import { Table } from 'lucide-react';

interface TableVisualizerProps {
  name: string;
  data: VariableValue;
  activeAccess?: ActiveAccess;
}

const TableVisualizer: React.FC<TableVisualizerProps> = ({ name, data, activeAccess }) => {
  const rawRows = Array.isArray(data.value) ? data.value : [];

  // Normalize rows: unwrap if the row is a VariableValue wrapper (e.g. { type: 'map', value: {...} })
  // This ensures we visualize the actual data properties, not the wrapper metadata.
  const rows = rawRows.map((r: any) => {
      if (r && typeof r === 'object' && (r.type === 'map' || r.type === 'object') && r.value) {
          return r.value;
      }
      // If it's a wrapper for a primitive, strictly speaking it shouldn't be here (VisualizerCanvas filters), 
      // but if it is, unwrap it to show the value at least.
      if (r && typeof r === 'object' && r.type === 'primitive' && 'value' in r) {
          return { value: r.value }; 
      }
      return r;
  });
  
  if (rows.length === 0) return (
      <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40 text-slate-500 italic text-sm">
          {name}: Empty Table
      </div>
  );

  // Collect all unique keys for columns
  // Filter out internal wrapper keys if they slipped through
  const metadataKeys = new Set(['type', 'value', 'displayValue', 'address', 'targetAddress', 'properties']);
  
  // Explicitly type columns as string[] to avoid 'unknown' index type error
  const columns: string[] = Array.from<string>(new Set(rows.flatMap((r: any) => {
    if (r && typeof r === 'object') {
        return Object.keys(r).filter(k => !metadataKeys.has(k));
    }
    return [] as string[];
  }))).sort(); // Sort columns alphabetically for stability

  // If no columns found (e.g. list of empty objects), fallback or show minimal
  if (columns.length === 0 && rows.length > 0) {
      // It might be a list of primitives that passed the check?
      // Just show a "Value" column
      columns.push('value');
  }

  const isTarget = activeAccess?.target === name;
  const activeIndex = isTarget && activeAccess?.index !== undefined ? Number(activeAccess.index) : -1;

  return (
    <div className={`p-4 rounded-xl border backdrop-blur-md transition-all duration-300 ${isTarget ? 'bg-slate-800/80 border-blue-500 shadow-xl shadow-blue-900/20' : 'bg-slate-800/40 border-slate-700'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-700/50 pb-2">
            <div className="flex items-center gap-2">
                <Table size={14} className={isTarget ? 'text-blue-400' : 'text-slate-500'} />
                <span className={`text-sm font-bold font-mono ${isTarget ? 'text-blue-300' : 'text-slate-400'}`}>{name}</span>
                <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">Table</span>
            </div>
            <span className="text-xs text-slate-600 font-mono">{data.address}</span>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-2">
            <table className="w-full text-left text-sm font-mono border-collapse min-w-max">
                <thead>
                    <tr className="border-b border-slate-700 text-slate-500">
                        <th className="py-2 px-3 bg-slate-900/50 w-12 text-center text-xs uppercase tracking-wider">Idx</th>
                        {columns.map(col => (
                            <th key={col} className="py-2 px-3 bg-slate-900/50 font-semibold text-xs uppercase tracking-wider text-slate-400">{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row: any, idx: number) => {
                        const isActive = idx === activeIndex;
                        return (
                            <motion.tr 
                                key={idx}
                                initial={false}
                                animate={{
                                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                }}
                                className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group ${isActive ? 'ring-1 ring-inset ring-blue-500/50' : ''}`}
                            >
                                <td className={`py-2 px-3 text-center border-r border-slate-800/50 relative ${isActive ? 'text-blue-400 font-bold' : 'text-slate-600'}`}>
                                    {idx}
                                    {isActive && (
                                        <motion.div 
                                            layoutId={`active-row-indicator-${name}`}
                                            className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500"
                                        />
                                    )}
                                </td>
                                {columns.map(col => {
                                    // Handle if row is primitive but we forced a 'value' column
                                    const cellValue = (typeof row === 'object' && row !== null) ? (row as Record<string, any>)[col] : (col === 'value' ? row : undefined);
                                    
                                    let displayContent = cellValue;
                                    
                                    // Handle complex values inside cells
                                    if (typeof cellValue === 'object' && cellValue !== null) {
                                        displayContent = (cellValue as any).displayValue || (Array.isArray(cellValue) ? '[...]' : '{...}');
                                    }

                                    return (
                                        <td key={`${idx}-${col}`} className="py-2 px-3 text-slate-300 whitespace-nowrap">
                                            {cellValue !== undefined ? (
                                                <span className={typeof cellValue === 'string' ? 'text-green-400' : typeof cellValue === 'number' ? 'text-orange-400' : 'text-slate-300'}>
                                                    {typeof cellValue === 'string' ? `"${displayContent}"` : String(displayContent)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-700">-</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default TableVisualizer;