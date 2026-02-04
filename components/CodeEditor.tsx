import React, { useState, useEffect, useRef } from 'react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  language: string;
  highlightLine?: number;
  breakpoints: number[];
  onToggleBreakpoint: (line: number) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  code, 
  onChange, 
  language, 
  highlightLine,
  breakpoints,
  onToggleBreakpoint
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to highlight line when it changes
  useEffect(() => {
    if (highlightLine && highlightLine > 0 && scrollContainerRef.current) {
        const lineHeight = 24; // h-6 = 24px
        const paddingTop = 16; // pt-4 = 16px
        
        // Calculate the pixel position of the highlighted line relative to the top of the content
        const lineTop = (highlightLine - 1) * lineHeight + paddingTop;
        const containerHeight = scrollContainerRef.current.clientHeight;
        
        // Determine scroll target to roughly center the line
        const scrollTop = lineTop - containerHeight / 2 + lineHeight / 2;
        
        scrollContainerRef.current.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
        });
    }
  }, [highlightLine]);

  // Handle Tab key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      onChange(newCode);
      setTimeout(() => {
        if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const lines = code.split('\n');
  const lineHeight = 24; // Fixed line height (h-6)
  
  // We use a fixed-height row approach for sync simplicity.
  // Code Area height grows with content.
  const contentHeight = lines.length * lineHeight;

  return (
    <div className="relative font-mono text-sm h-full flex flex-col bg-slate-900 text-slate-300 rounded-lg overflow-hidden border border-slate-700 shadow-inner">
      
      {/* Scrollable Container (Master Scroll) */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto flex relative"
      >
          {/* Gutter (Line Numbers) - Sticky to left during horizontal scroll */}
          <div className="w-12 flex-shrink-0 bg-slate-950 text-slate-600 text-right select-none leading-6 border-r border-slate-800 flex flex-col pt-4 pb-10 min-h-full sticky left-0 z-20">
            {lines.map((_, i) => {
                const lineNum = i + 1;
                const isBreakpoint = breakpoints.includes(lineNum);
                return (
                    <div 
                        key={i} 
                        className={`h-6 pr-2 relative cursor-pointer hover:bg-slate-800 hover:text-slate-400 transition-colors flex items-center justify-end group ${highlightLine === lineNum ? 'text-yellow-400 font-bold' : ''}`}
                        onClick={() => onToggleBreakpoint(lineNum)}
                    >
                        {/* Breakpoint Dot */}
                        <div className={`absolute left-1.5 w-2.5 h-2.5 rounded-full transition-all ${isBreakpoint ? 'bg-red-500 scale-100' : 'bg-red-500/30 scale-0 group-hover:scale-75'}`} />
                        
                        {/* Line Number */}
                        <span className="z-10">{lineNum}</span>
                    </div>
                );
            })}
          </div>

          {/* Editor Area */}
          <div className="relative flex-1 pt-4 pb-10 min-w-0">
            
            {/* Content Wrapper - Enforces height */}
            <div style={{ height: `${contentHeight}px` }} className="relative w-full">

                {/* Highlight Line Overlay */}
                {highlightLine !== undefined && highlightLine > 0 && (
                  <div 
                    className="absolute left-0 w-full h-6 bg-yellow-500/20 pointer-events-none transition-all duration-100"
                    style={{ top: `${(highlightLine - 1) * lineHeight}px` }}
                  />
                )}
                
                {/* Breakpoint Line Overlay */}
                {breakpoints.map(bp => (
                     <div 
                        key={`bp-${bp}`}
                        className="absolute left-0 w-full h-6 bg-red-500/10 pointer-events-none"
                        style={{ top: `${(bp - 1) * lineHeight}px` }}
                     />
                ))}

                {/* Syntax Highlighting Layer (Underlay) */}
                <div className="absolute inset-0 w-full h-full m-0 p-0 pl-2 pointer-events-none leading-6 font-mono whitespace-pre z-0">
                     {lines.map((line, i) => (
                        <div key={i} className="h-6 overflow-hidden whitespace-pre">
                            {line.split(/(\s+)/).map((token, j) => {
                                let color = "text-slate-300";
                                if (/^(def|class|function|var|let|const|if|else|for|while|return|import|package|public|static|void|int|float|string|bool)/.test(token)) color = "text-pink-400";
                                else if (/^["'].*["']$/.test(token)) color = "text-green-400";
                                else if (/^\d+$/.test(token)) color = "text-orange-400";
                                else if (/^(true|false|null|None)/.test(token)) color = "text-blue-400";
                                else if (/\/\//.test(token) || /#/.test(token)) color = "text-slate-500";
                                else if (/[(){}\[\],.]/.test(token)) color = "text-yellow-200";
                                
                                return <span key={j} className={color}>{token}</span>;
                            })}
                        </div>
                     ))}
                </div>

                {/* Interactive Textarea (Overlay) */}
                <textarea
                    ref={textareaRef}
                    className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white resize-none p-0 pl-2 leading-6 outline-none font-mono z-10 whitespace-pre overflow-hidden"
                    value={code}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                />

            </div>
          </div>
      </div>
    </div>
  );
};

export default CodeEditor;