import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Square } from 'lucide-react';

interface ControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onStop: () => void;
  currentStep: number;
  totalSteps: number;
  speed: number;
  setSpeed: (s: number) => void;
  isGenerating: boolean;
}

const Controls: React.FC<ControlsProps> = ({ 
  isPlaying, onPlayPause, onStepForward, onStepBack, onStop, 
  currentStep, totalSteps, speed, setSpeed, isGenerating 
}) => {
  return (
    <div className="flex items-center justify-between bg-slate-900 p-3 border-t border-slate-800 text-slate-300">
        
        {/* Playback Buttons */}
        <div className="flex items-center gap-2">
            <button 
                onClick={onStop}
                disabled={isGenerating || totalSteps === 0}
                className="p-2 rounded hover:bg-slate-800 text-red-400 disabled:opacity-50 transition-colors"
                title="Reset"
            >
                <Square size={16} fill="currentColor" />
            </button>
            <div className="w-px h-6 bg-slate-800 mx-1"></div>
            <button 
                onClick={onStepBack}
                disabled={isGenerating || currentStep === 0 || isPlaying}
                className="p-2 rounded hover:bg-slate-800 disabled:opacity-50"
            >
                <SkipBack size={18} />
            </button>
            <button 
                onClick={onPlayPause}
                disabled={isGenerating || totalSteps === 0}
                className="p-2 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:bg-slate-800 disabled:text-slate-500 transition-colors shadow-lg shadow-blue-900/20"
            >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
            <button 
                onClick={onStepForward}
                disabled={isGenerating || currentStep >= totalSteps - 1 || isPlaying}
                className="p-2 rounded hover:bg-slate-800 disabled:opacity-50"
            >
                <SkipForward size={18} />
            </button>
        </div>

        {/* Slider / Progress */}
        <div className="flex-1 mx-8 flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>Step {currentStep + 1} / {Math.max(1, totalSteps)}</span>
                <span>{isGenerating ? "Compiling & Tracing..." : "Ready"}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                <div 
                    className={`absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300 ${isGenerating ? 'animate-pulse w-full bg-blue-900' : ''}`}
                    style={{ width: isGenerating ? '100%' : `${((currentStep + 1) / Math.max(1, totalSteps)) * 100}%` }}
                />
            </div>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">Speed</span>
            <input 
                type="range" 
                min="100" 
                max="2000" 
                step="100"
                value={2100 - speed} 
                onChange={(e) => setSpeed(2100 - Number(e.target.value))}
                className="w-24 accent-blue-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
        </div>
    </div>
  );
};

export default Controls;
