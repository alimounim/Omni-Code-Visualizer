import React, { useEffect, useRef } from 'react';
import { Terminal, Loader2 } from 'lucide-react';

interface ConsoleProps {
  output: string;
  isRunning?: boolean;
}

const Console: React.FC<ConsoleProps> = ({ output, isRunning }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output, isRunning]);

  return (
    <div className="h-1/4 border-t border-slate-800 flex flex-col bg-slate-950">
        <div className="px-4 py-1 bg-slate-900 border-b border-slate-800 text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Terminal size={12} /> 
                <span>Console Output</span>
            </div>
            {isRunning && (
                <div className="flex items-center gap-1 text-blue-400">
                    <Loader2 size={10} className="animate-spin" />
                    <span className="text-[10px]">Running...</span>
                </div>
            )}
        </div>
        <div 
            ref={scrollRef}
            className="p-2 font-mono text-sm text-slate-300 overflow-y-auto flex-1 bg-black/40 relative"
        >
            <pre className="whitespace-pre-wrap leading-tight font-mono break-all">
                {output}
                {/* Blinking Cursor */}
                <span className="inline-block w-2 h-4 bg-slate-500 ml-0.5 align-middle animate-pulse"></span>
            </pre>
            
            {!output && !isRunning && (
                <div className="absolute top-2 left-2 text-slate-600 italic pointer-events-none">
                    // Output will appear here...
                </div>
            )}
        </div>
    </div>
  );
};

export default Console;