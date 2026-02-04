import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Code2, Network, Cpu, Layout, AlertCircle, Sparkles, MessageSquareWarning, Bug, Terminal, ScanEye, Volume2, VolumeX } from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import VisualizerCanvas from './components/VisualizerCanvas';
import Controls from './components/Controls';
import Console from './components/Console';
import AIAssistant from './components/AIAssistant';
import LiveTutor from './components/LiveTutor';
import FeedbackModal from './components/FeedbackModal';
import { LANGUAGES, TEMPLATES } from './constants';
import { generateExecutionTrace, executeCode } from './services/geminiService';
import { playTTS, stopTTS } from './services/ttsService';
import { ExecutionTrace, Language } from './types';

// Regex patterns to detect if code might need input
const INPUT_PATTERNS: Record<string, RegExp> = {
  python: /input\s*\(/,
  javascript: /prompt\s*\(|readline/,
  cpp: /cin\s*>>|scanf|getline/,
  java: /Scanner|System\.in|console\.readLine/,
  go: /fmt\.Scan|bufio/
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState<string>(TEMPLATES['python'].code);
  
  const [trace, setTrace] = useState<ExecutionTrace | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000);
  const [error, setError] = useState<string | null>(null);
  
  // Track which mode initiated the generation to update UI accordingly
  const [runMode, setRunMode] = useState<'visualize' | 'run' | null>(null);

  // Breakpoint State
  const [breakpoints, setBreakpoints] = useState<number[]>([]);

  // AI Assistant State
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  // Feedback/Fix Loop State
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);
  const [isFixing, setIsFixing] = useState<boolean>(false);

  // Narrator State
  const [isNarratorEnabled, setIsNarratorEnabled] = useState<boolean>(false);
  const isNarratingRef = useRef<boolean>(false); // Ref to track async playback status

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load template when language changes
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setCode(TEMPLATES[lang].code);
    setTrace(null);
    setCurrentStepIndex(0);
    setError(null);
    setBreakpoints([]); // Clear breakpoints on language switch
  };

  const handleToggleBreakpoint = (line: number) => {
    setBreakpoints(prev => 
      prev.includes(line) 
        ? prev.filter(l => l !== line) 
        : [...prev, line]
    );
  };

  const handleExecute = async (mode: 'visualize' | 'run' | 'fix', feedback?: string) => {
    if (!process.env.API_KEY) {
        try {
            if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
                // Good
            } else if (window.aistudio) {
                 await window.aistudio.openSelectKey();
            }
        } catch(e) { /* ignore if not in that env */ }
    }

    if (mode === 'fix') {
        setIsFixing(true);
    } else {
        setIsGenerating(true);
        setRunMode(mode);
    }
    
    setError(null);
    setIsPlaying(false);
    stopTTS(); // Stop any ongoing narration

    try {
      if (mode === 'run') {
        // Run Mode: Fast, text only, NO visualization
        
        // 1. Check for Input
        let stdin = "";
        const pattern = INPUT_PATTERNS[language];
        if (pattern && pattern.test(code)) {
            const userInput = window.prompt("This code may require input. Enter Standard Input (stdin):");
            if (userInput !== null) {
                stdin = userInput;
            }
        }

        setTrace(null); // Clear any existing visualization
        
        // 2. Execute with Input
        const output = await executeCode(code, language, stdin);
        
        // Create a minimal trace object just to hold the output for the Console component
        const runTrace: ExecutionTrace = {
            steps: [{
                line: 0,
                event: 'end',
                output: output,
                variables: {}, 
                scopeName: 'global'
            }]
        };
        setTrace(runTrace);
        setCurrentStepIndex(0);

      } else {
        // Visualize or Fix Mode: Full JSON generation
        if (mode !== 'fix') {
            setTrace(null);
            setCurrentStepIndex(0);
        }

        const result = await generateExecutionTrace(code, language, feedback);
        if (result.error) {
            setError(result.error);
        } else {
            setTrace(result);
            setCurrentStepIndex(0); // Always start at 0 for visualization
            if (mode === 'fix') {
                setIsFeedbackOpen(false);
            }
        }
      }
    } catch (e) {
      setError("Execution failed. Please try again.");
    } finally {
      setIsGenerating(false);
      setIsFixing(false);
      setRunMode(null);
    }
  };

  const handleFeedbackSubmit = (feedback: string) => {
      handleExecute('fix', feedback);
  };

  // Playback Logic
  // Loop driver
  const [playbackTrigger, setPlaybackTrigger] = useState(0);

  useEffect(() => {
     if (!isPlaying) return;
     
     let timeout: ReturnType<typeof setTimeout>;

     const run = async () => {
         // Safety check
         if (!trace || currentStepIndex >= trace.steps.length - 1) {
             setIsPlaying(false);
             return;
         }

         const nextIndex = currentStepIndex + 1;
         const nextStep = trace.steps[nextIndex];

         // 1. Breakpoint Check
         if (breakpoints.includes(nextStep.line)) {
             setCurrentStepIndex(nextIndex);
             setIsPlaying(false);
             return;
         }

         // 2. Execution Logic
         setCurrentStepIndex(nextIndex); // Update visual immediately

         if (isNarratorEnabled) {
             // --- Narrator Mode ---
             // Play Audio & Wait
             const text = nextStep.explanation || `Executing Line ${nextStep.line}`;
             
             // await playTTS returns TRUE if finished naturally, FALSE if interrupted
             const completed = await playTTS(text);
             
             if (completed && isPlayingRef.current) {
                 // Add exact 1s gap before next step
                 timeout = setTimeout(() => {
                     if (isPlayingRef.current) {
                        setPlaybackTrigger(t => t + 1);
                     }
                 }, 1000);
             }
         }
     };

     if (isNarratorEnabled) {
         // In narrator mode, 'run' is async and handles the "wait for audio" + "wait 1s" logic internally
         // We call it once, and it triggers the next loop via setPlaybackTrigger
         run();
     } else {
         // In standard mode, we use setTimeout to handle the speed delay *before* the next step triggers
         timeout = setTimeout(() => {
             // In standard mode, run() is synchronous logic-wise but we wrapped it in async above.
             // We can just execute the logic manually or re-use run. 
             // Re-using run for standard mode is tricky because run() is async and designed for await TTS.
             // Let's keep it simple:
             if (!trace || currentStepIndex >= trace.steps.length - 1) {
                 setIsPlaying(false);
                 return;
             }
             const nextIndex = currentStepIndex + 1;
             const nextStep = trace.steps[nextIndex];

             if (breakpoints.includes(nextStep.line)) {
                setCurrentStepIndex(nextIndex);
                setIsPlaying(false);
                return;
             }
             
             setCurrentStepIndex(nextIndex);
             setPlaybackTrigger(t => t + 1);

         }, playbackSpeed);
     }

     return () => clearTimeout(timeout);
  }, [isPlaying, playbackTrigger, isNarratorEnabled, playbackSpeed]); // Main Loop

  // Ref to track play status inside async functions
  const isPlayingRef = useRef(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Handler to stop everything
  const handleStop = () => {
      setIsPlaying(false);
      setCurrentStepIndex(0);
      stopTTS();
  };

  const handlePause = () => {
      setIsPlaying(false);
      stopTTS();
  };

  const currentStep = trace?.steps[currentStepIndex];

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 border-b border-slate-800 flex items-center px-4 justify-between bg-slate-900/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-500/20">
                <Network size={20} className="text-white" />
            </div>
            <div>
                <h1 className="font-bold text-lg tracking-tight text-white leading-none">Omni-Code-Visualizer</h1>
                <p className="text-[10px] text-slate-400 font-mono tracking-wide uppercase">AI-Powered Logic</p>
            </div>
        </div>

        <div className="flex items-center gap-4">
             {/* Live Tutor (Conversational Voice) */}
             <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1 border border-slate-700">
                <LiveTutor code={code} language={language} />
                
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                
                {/* Narrator Toggle */}
                <button
                    onClick={() => {
                        const newState = !isNarratorEnabled;
                        setIsNarratorEnabled(newState);
                        if (!newState) stopTTS();
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        isNarratorEnabled
                        ? 'bg-teal-900/30 text-teal-300 border border-teal-500/50'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                    }`}
                    title={isNarratorEnabled ? "Disable Step Narration" : "Enable Professor Narration Mode"}
                >
                    {isNarratorEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    <span className="hidden sm:inline">Narrator</span>
                </button>
             </div>

             {/* AI Assistant Toggle */}
             <button
                onClick={() => setIsAssistantOpen(!isAssistantOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
                    isAssistantOpen 
                    ? 'bg-purple-900/30 text-purple-300 border-purple-500/50' 
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
            >
                <Sparkles size={16} className={isAssistantOpen ? 'text-purple-400' : 'text-slate-400'} />
                <span>AI Assistant</span>
            </button>

             {/* Language Selector */}
            <div className="relative group">
                <select 
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value as Language)}
                    disabled={isGenerating || isFixing}
                    className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer hover:bg-slate-750 transition-colors"
                >
                    {LANGUAGES.map(lang => (
                        <option key={lang.id} value={lang.id}>{lang.label}</option>
                    ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Code2 size={14} />
                </div>
            </div>

            <div className="h-6 w-px bg-slate-700 mx-1"></div>

            {/* Visualize Button */}
            <button
                onClick={() => handleExecute('visualize')}
                disabled={isGenerating || isFixing}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-all shadow-lg shadow-indigo-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Execute and visualize step-by-step"
            >
                {isGenerating && runMode === 'visualize' ? (
                    <>
                        <Cpu className="animate-spin" size={16} />
                        <span>Tracing...</span>
                    </>
                ) : (
                    <>
                        <ScanEye size={16} />
                        <span>Visualize</span>
                    </>
                )}
            </button>

            {/* Run Button */}
            <button
                onClick={() => handleExecute('run')}
                disabled={isGenerating || isFixing}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-all shadow-lg shadow-green-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Execute and see final output"
            >
                {isGenerating && runMode === 'run' ? (
                    <>
                        <Cpu className="animate-spin" size={16} />
                        <span>Running...</span>
                    </>
                ) : (
                    <>
                        <Play size={16} fill="currentColor" />
                        <span>Run</span>
                    </>
                )}
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Editor Pane (Left) */}
        <div className="w-1/3 min-w-[350px] flex flex-col border-r border-slate-800 bg-slate-900/30">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Code2 size={14} /> Source Code
                </span>
            </div>
            <div className="flex-1 p-2 overflow-hidden">
                <CodeEditor 
                    code={code} 
                    onChange={setCode} 
                    language={language} 
                    highlightLine={currentStep?.line}
                    breakpoints={breakpoints}
                    onToggleBreakpoint={handleToggleBreakpoint}
                />
            </div>
            
            {/* Output Console */}
            <Console 
                output={currentStep?.output || ''} 
                isRunning={isGenerating && runMode === 'run'}
            />
        </div>

        {/* Visualizer Pane (Right) */}
        <div className="flex-1 flex flex-col bg-slate-950 relative">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Layout size={14} /> Logic Visualization
                </span>
                
                <div className="flex items-center gap-3">
                    {/* Feedback / Fix Button */}
                    <button 
                        onClick={() => setIsFeedbackOpen(true)}
                        className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-orange-400 px-2.5 py-1 rounded border border-slate-700 hover:border-orange-500/50 transition-colors"
                        title="Report an issue with the visualization to let the AI fix it"
                    >
                        <MessageSquareWarning size={14} />
                        <span>Fix Visualization</span>
                    </button>

                    {currentStep?.explanation && (
                        <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded border border-blue-900/50 animate-pulse">
                            {currentStep.explanation}
                        </span>
                    )}
                </div>
            </div>
            
            <div className="flex-1 p-4 overflow-hidden relative">
                {error ? (
                    <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                        <div className="bg-red-900/20 border border-red-800 text-red-200 p-6 rounded-xl max-w-md">
                            <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
                            <h3 className="text-lg font-bold mb-2">Execution Error</h3>
                            <p className="text-sm opacity-80">{error}</p>
                        </div>
                    </div>
                ) : (
                    <VisualizerCanvas 
                        variables={currentStep?.variables || {}} 
                        language={language}
                        scopeName={currentStep?.scopeName}
                        activeAccess={currentStep?.activeAccess}
                        controlFlow={currentStep?.controlFlow}
                        eventLoop={currentStep?.eventLoop}
                    />
                )}
            </div>

            {/* Playback Controls */}
            <Controls 
                isPlaying={isPlaying}
                onPlayPause={() => {
                    if (isPlaying) handlePause();
                    else setIsPlaying(true);
                }}
                onStepForward={() => {
                    stopTTS(); // Stop immediately for responsiveness
                    setCurrentStepIndex(prev => Math.min((trace?.steps.length || 1) - 1, prev + 1));
                }}
                onStepBack={() => {
                    stopTTS(); // Stop immediately for responsiveness
                    setCurrentStepIndex(prev => Math.max(0, prev - 1));
                }}
                onStop={handleStop}
                currentStep={currentStepIndex}
                totalSteps={trace?.steps.length || 0}
                speed={playbackSpeed}
                setSpeed={setPlaybackSpeed}
                isGenerating={isGenerating || isFixing}
            />
        </div>

        {/* AI Assistant Overlay */}
        <AIAssistant 
            isOpen={isAssistantOpen}
            onClose={() => setIsAssistantOpen(false)}
            code={code}
            language={language}
            onApplyCode={setCode}
        />

        {/* Feedback Modal */}
        <FeedbackModal 
            isOpen={isFeedbackOpen}
            onClose={() => setIsFeedbackOpen(false)}
            onSubmit={handleFeedbackSubmit}
            isFixing={isFixing}
        />

      </main>

      {/* Global API Key Helper */}
      {!process.env.API_KEY && (
          <div className="absolute bottom-4 right-4 max-w-sm bg-yellow-900/90 text-yellow-100 p-4 rounded-lg shadow-xl border border-yellow-700 text-sm z-50 backdrop-blur">
              <strong>Demo Mode:</strong> Please ensure the API Key is set in the environment.
          </div>
      )}
    </div>
  );
};

export default App;