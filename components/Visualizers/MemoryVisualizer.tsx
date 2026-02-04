import React from 'react';
import { VariableValue } from '../../types';
import { ArrowRight } from 'lucide-react';

interface MemoryVisualizerProps {
  variables: Record<string, VariableValue>;
}

const MemoryVisualizer: React.FC<MemoryVisualizerProps> = ({ variables }) => {
  const pointerVars = (Object.entries(variables) as [string, VariableValue][]).filter(([_, v]) => v.type === 'pointer' || v.address);

  if (pointerVars.length === 0) return null;

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 h-full overflow-y-auto">
      <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Memory / Pointers</h3>
      <table className="w-full text-left text-sm font-mono border-collapse">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500">
            <th className="py-2 pl-2">Variable</th>
            <th className="py-2">Address</th>
            <th className="py-2">Value / Target</th>
          </tr>
        </thead>
        <tbody>
          {pointerVars.map(([name, v]) => (
            <tr key={name} className="border-b border-slate-800/50 hover:bg-slate-800/30">
              <td className="py-2 pl-2 text-green-400 font-semibold">{name}</td>
              <td className="py-2 text-slate-500">{v.address || '-'}</td>
              <td className="py-2 text-slate-300">
                <div className="flex items-center gap-2">
                    {v.type === 'pointer' ? (
                         <>
                            <span className="text-pink-400">{v.targetAddress}</span>
                            {v.targetAddress && <ArrowRight size={12} className="text-slate-600" />}
                         </>
                    ) : (
                        <span className="truncate max-w-[100px]">{String(v.displayValue || v.value).substring(0, 20)}</span>
                    )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MemoryVisualizer;