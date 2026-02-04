import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventLoopState } from '../../types';
import { Layers, Timer, ListEnd, ArrowDown, RefreshCw } from 'lucide-react';

interface EventLoopVisualizerProps {
  state?: EventLoopState;
}

const EventLoopVisualizer: React.FC<EventLoopVisualizerProps> = ({ state }) => {
  if (!state) return null;

  const { callStack = [], webApis = [], taskQueue = [] } = state;

  return (
    <div className="w-full flex flex-col gap-2 p-4 bg-slate-900/40 rounded-xl border border-slate-700 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2 text-yellow-500 text-sm font-bold uppercase tracking-wider">
        <RefreshCw size={16} className="animate-spin-slow" />
        JavaScript Event Loop
      </div>

      <div className="flex gap-4 min-h-[220px]">
        
        {/* 1. Call Stack */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-mono font-bold uppercase">
            <Layers size={12} /> Call Stack
          </div>
          <div className="flex-1 border-2 border-b-0 border-slate-700 rounded-t-lg bg-slate-900/60 p-2 flex flex-col-reverse justify-start gap-2 relative overflow-hidden">
             {/* Base line */}
             <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-600"></div>
             
             <AnimatePresence mode='popLayout'>
               {callStack.map((frame, i) => (
                 <motion.div
                    key={`${frame.name}-${i}`}
                    layoutId={`stack-${frame.name}`}
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.1 } }}
                    className="w-full p-2 bg-orange-600 text-white text-xs font-mono font-bold rounded shadow-lg border border-orange-400 flex items-center justify-between"
                 >
                    <span>{frame.name}</span>
                    <span className="text-[9px] opacity-70 bg-black/20 px-1 rounded">Ln {i+1}</span>
                 </motion.div>
               ))}
             </AnimatePresence>
             
             {callStack.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs italic">
                    Stack Empty
                </div>
             )}
          </div>
        </div>

        {/* Arrow Connector */}
        <div className="flex flex-col items-center justify-center gap-1 w-8">
            <div className="h-full w-px border-l border-dashed border-slate-700 relative">
               {/* Animated dots flowing down */}
               <motion.div 
                 animate={{ y: [0, 100], opacity: [0, 1, 0] }}
                 transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                 className="absolute top-0 -left-[1px] w-0.5 h-4 bg-yellow-500/50"
               />
            </div>
        </div>

        {/* 2. Web APIs */}
        <div className="flex-1 flex flex-col">
           <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-mono font-bold uppercase">
            <Timer size={12} /> Web APIs
          </div>
          <div className="flex-1 border border-slate-700 rounded-lg bg-slate-900/30 p-2 flex flex-col gap-2 relative">
             <AnimatePresence>
                {webApis.map((api) => (
                    <motion.div
                        key={api.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-2 bg-blue-900/40 border border-blue-500/30 rounded relative overflow-hidden group"
                    >
                         {/* Progress Bar Background */}
                         <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: (api.duration || 1000) / 1000, ease: "linear" }}
                            className="absolute top-0 left-0 bottom-0 bg-blue-500/10 z-0"
                         />

                         <div className="relative z-10 flex justify-between items-center text-xs text-blue-200 font-mono">
                             <span className="font-bold">{api.type}</span>
                             <span className="text-[10px] text-blue-400">{api.duration}ms</span>
                         </div>
                         <div className="relative z-10 text-[10px] text-slate-400 truncate">
                             Callback: <span className="text-white">{api.callback}</span>
                         </div>
                    </motion.div>
                ))}
             </AnimatePresence>

             {webApis.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs italic">
                    Idle
                </div>
             )}
          </div>
        </div>

         {/* Arrow Connector */}
         <div className="flex flex-col items-center justify-center gap-1 w-8">
            <ArrowDown size={16} className="text-slate-600 -rotate-90" />
        </div>

        {/* 3. Task Queue */}
        <div className="flex-1 flex flex-col">
           <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-mono font-bold uppercase">
            <ListEnd size={12} /> Task Queue
          </div>
          <div className="flex-1 border border-slate-700 rounded-lg bg-slate-900/30 p-2 flex flex-col justify-start gap-2 relative">
             
             {/* Queue Entry Point */}
             <div className="absolute top-0 right-0 w-4 h-full border-r border-dashed border-slate-800"></div>

             <AnimatePresence>
                {taskQueue.map((task) => (
                     <motion.div
                        key={task.id}
                        layoutId={`task-${task.id}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, y: -20 }} // Moves up to stack conceptually
                        className="p-2 bg-green-900/40 border border-green-500/40 rounded text-xs font-mono text-green-200 shadow-sm"
                     >
                        <div className="font-bold flex justify-between">
                            <span>{task.name}</span>
                            <span className="text-[9px] bg-green-900 px-1 rounded">Task</span>
                        </div>
                     </motion.div>
                ))}
             </AnimatePresence>

             {taskQueue.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs italic">
                    Queue Empty
                </div>
             )}
          </div>
          
          {/* Event Loop Logic Visual */}
          <div className="mt-2 h-10 border-t border-slate-700 flex items-center justify-center text-[10px] text-slate-500 gap-2">
             <div className={`w-2 h-2 rounded-full ${callStack.length === 0 && taskQueue.length > 0 ? 'bg-green-500 animate-ping' : 'bg-slate-700'}`}></div>
             <span>Event Loop Check</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EventLoopVisualizer;
