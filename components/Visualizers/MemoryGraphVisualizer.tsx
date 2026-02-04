import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VariableValue, ActiveAccess } from '../../types';
import ArrayVisualizer from './ArrayVisualizer';
import StackVisualizer from './StackVisualizer';
import QueueVisualizer from './QueueVisualizer';
import DictionaryVisualizer from './DictionaryVisualizer';
import TreeVisualizer from './TreeVisualizer';
import TableVisualizer from './TableVisualizer';
import { ArrowRight, Cpu, Anchor } from 'lucide-react';

interface MemoryGraphVisualizerProps {
  variables: Record<string, VariableValue>;
  activeAccess?: ActiveAccess;
}

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  address?: string;
  name: string;
}

const MemoryGraphVisualizer: React.FC<MemoryGraphVisualizerProps> = ({ variables, activeAccess }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [tick, setTick] = useState(0); // Force re-render for layout updates

  // Update positions on every render/resize/variable change
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updatePositions = () => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const newPositions: Record<string, NodePosition> = {};
        
        (Object.entries(nodeRefs.current) as [string, HTMLDivElement | null][]).forEach(([name, el]) => {
            if (el) {
                const rect = el.getBoundingClientRect();
                const variable = variables[name];
                newPositions[name] = {
                    x: rect.left - containerRect.left,
                    y: rect.top - containerRect.top,
                    width: rect.width,
                    height: rect.height,
                    address: variable?.address,
                    name: name
                };
            }
        });
        setPositions(newPositions);
    };

    // Use ResizeObserver for robust updates
    const observer = new ResizeObserver(updatePositions);
    if (containerRef.current) observer.observe(containerRef.current);
    
    // Also trigger immediately and on slight delay to catch animations
    updatePositions();
    const t = setTimeout(updatePositions, 300);

    return () => {
        observer.disconnect();
        clearTimeout(t);
    };
  }, [variables, tick]);

  // Helper to render the inner content of a memory block
  const renderInnerContent = (name: string, data: VariableValue) => {
    if (data.type === 'pointer') {
         // Special Pointer Display
         const isNull = !data.value || data.value === 'NULL' || data.value === 'nullptr' || data.value === '0x0';
         return (
             <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded border border-slate-700 font-mono text-sm">
                 <span className="text-pink-400 font-bold">{data.value}</span>
                 {isNull ? (
                     <span className="text-slate-500 text-xs italic ml-2">NULL</span>
                 ) : (
                    <ArrowRight size={14} className="text-slate-500 ml-2" />
                 )}
             </div>
         );
    }
    
    if (data.type === 'stack') return <StackVisualizer name={name} data={data} />;
    if (data.type === 'queue') return <QueueVisualizer name={name} data={data} />;
    if (data.type === 'array') return <ArrayVisualizer name={name} data={data} activeAccess={activeAccess} />;
    if (data.type === 'map' || data.type === 'object') return <DictionaryVisualizer name={name} data={data} activeAccess={activeAccess} />;
    if (data.type === 'tree_node' || data.type === 'linked_list_node') return <TreeVisualizer name={name} data={data} />;
    
    // Primitives
    return (
        <div className="bg-slate-900/80 p-3 rounded text-center border border-slate-700 min-w-[80px]">
             <span className="text-xl font-bold text-green-400 font-mono">{String(data.value)}</span>
        </div>
    );
  };

  const pointers = (Object.entries(variables) as [string, VariableValue][]).filter(([_, v]) => v.type === 'pointer');

  return (
    <div className="relative w-full h-full min-h-[400px] bg-slate-950/50 rounded-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-2 flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 z-10">
            <Cpu size={14} className="text-purple-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Memory Map</span>
        </div>

        {/* Content Container (Scrollable) */}
        <div 
            ref={containerRef} 
            className="flex-1 overflow-auto p-8 pt-12 relative"
            onScroll={() => setTick(t => t + 1)} // Re-calc lines on scroll
        >
            {/* SVG Layer for Arrows */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-20 overflow-visible">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#ec4899" />
                    </marker>
                    <marker id="arrowhead-ghost" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                         <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
                    </marker>
                </defs>
                {pointers.map(([ptrName, ptrData]) => {
                    const sourcePos = positions[ptrName];
                    if (!sourcePos) return null;

                    // Find Target
                    const targetEntry = (Object.entries(positions) as [string, NodePosition][]).find(([_, pos]) => pos.address === ptrData.targetAddress);
                    
                    if (targetEntry) {
                        const [targetName, targetPos] = targetEntry;
                        
                        // Calculate Start and End Points
                        // Start: Right side of source block
                        const startX = sourcePos.x + sourcePos.width;
                        const startY = sourcePos.y + sourcePos.height / 2;
                        
                        // End: Left side of target block
                        const endX = targetPos.x;
                        const endY = targetPos.y + targetPos.height / 2;

                        // Bezier Curve Logic
                        const dist = Math.abs(endX - startX);
                        const controlPointX1 = startX + dist * 0.5;
                        const controlPointX2 = endX - dist * 0.5;
                        
                        // If element is below/above, adjust curve
                        const pathData = `M ${startX} ${startY} C ${controlPointX1} ${startY}, ${controlPointX2} ${endY}, ${endX} ${endY}`;

                        return (
                            <g key={`${ptrName}-${targetName}`}>
                                <path 
                                    d={pathData} 
                                    fill="none" 
                                    stroke="#ec4899" 
                                    strokeWidth="2" 
                                    markerEnd="url(#arrowhead)"
                                    className="drop-shadow-md animate-pulse"
                                />
                                <circle cx={startX} cy={startY} r="3" fill="#ec4899" />
                            </g>
                        );
                    } else if (ptrData.targetAddress && ptrData.targetAddress !== '0x0' && ptrData.targetAddress !== 'NULL') {
                        // Dangling pointer or target not in scope
                         const startX = sourcePos.x + sourcePos.width;
                         const startY = sourcePos.y + sourcePos.height / 2;
                         return (
                            <g key={`${ptrName}-unknown`}>
                                <path 
                                    d={`M ${startX} ${startY} l 20 0`} 
                                    stroke="#475569" 
                                    strokeWidth="2" 
                                    strokeDasharray="4"
                                    markerEnd="url(#arrowhead-ghost)"
                                />
                                <text x={startX + 25} y={startY + 3} fontSize="10" fill="#64748b" fontFamily="monospace">?</text>
                            </g>
                         );
                    }
                    
                    return null;
                })}
            </svg>

            {/* Nodes Layout */}
            <div className="flex flex-wrap gap-8 items-start content-start">
                {(Object.entries(variables) as [string, VariableValue][]).map(([name, data]) => (
                    <motion.div
                        key={name}
                        ref={(el: any) => (nodeRefs.current[name] = el)}
                        layout // Framer Motion layout animation
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`
                            relative group flex flex-col
                            bg-slate-800/40 backdrop-blur-md 
                            border-2 ${data.type === 'pointer' ? 'border-pink-500/50 shadow-lg shadow-pink-900/10' : 'border-slate-700 hover:border-blue-500/50'}
                            rounded-xl p-3 min-w-[160px] max-w-[400px] z-10
                        `}
                    >
                        {/* Header: Name & Address */}
                        <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700/50">
                            <div className="flex items-center gap-2">
                                {data.type === 'pointer' ? <Anchor size={12} className="text-pink-400"/> : <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                <span className="font-mono font-bold text-sm text-slate-200">{name}</span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-900 px-1 rounded border border-slate-800">
                                {data.address || '0x???'}
                            </span>
                        </div>

                        {/* Body */}
                        <div className="relative">
                            {renderInnerContent(name, data)}
                        </div>
                        
                        {/* Type Label Footer */}
                        <div className="mt-2 text-[9px] text-slate-600 font-mono uppercase text-right tracking-wider">
                            {data.type}
                        </div>
                    </motion.div>
                ))}
            </div>
            
            {Object.keys(variables).length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                    <span className="italic">Memory Empty</span>
                </div>
            )}
        </div>
    </div>
  );
};

export default MemoryGraphVisualizer;