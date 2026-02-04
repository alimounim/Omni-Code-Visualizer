import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Radio, Volume2, X, Monitor, StopCircle, Loader2 } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createAudioBlob, base64Decode, pcmToAudioBuffer } from '../services/audioUtils';

interface LiveTutorProps {
  code: string;
  language: string;
}

const LiveTutor: React.FC<LiveTutorProps> = ({ code, language }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSharingLoading, setIsSharingLoading] = useState(false);
  const [volume, setVolume] = useState(0); // For visualizer

  // Refs for audio handling to avoid re-renders
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Video/Screen Sharing Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session management
  const sessionRef = useRef<Promise<any> | null>(null);

  const stopScreenShare = () => {
    if (screenIntervalRef.current) {
        clearInterval(screenIntervalRef.current);
        screenIntervalRef.current = null;
    }
    if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
    setIsScreenSharing(false);
    setIsSharingLoading(false);
  };

  const startScreenShare = async () => {
    if (!isActive) {
        alert("Please start the Voice Tutor session first.");
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert("Screen sharing is not supported in this browser or environment.");
        return;
    }

    setIsSharingLoading(true);

    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: { 
                width: { max: 1280 },
                height: { max: 720 },
                frameRate: { max: 5 } // Low framerate is fine for coding
            },
            audio: false 
        });
        
        screenStreamRef.current = stream;
        
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Ensure we try to play, handling any potential promise rejections from play()
            videoRef.current.play().catch(e => console.error("Video play error:", e));
        }

        setIsScreenSharing(true);

        // Handle user stopping stream via browser UI
        stream.getVideoTracks()[0].onended = () => {
            stopScreenShare();
        };

        // Start capture loop (1 FPS to save tokens/bandwidth)
        screenIntervalRef.current = setInterval(() => {
            if (!videoRef.current || !canvasRef.current || !sessionRef.current) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            if (ctx && video.videoWidth > 0) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Get JPEG base64
                const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                
                sessionRef.current.then(session => {
                    // Send image frame to the model
                    session.sendRealtimeInput({
                        media: {
                            mimeType: 'image/jpeg',
                            data: base64Data
                        }
                    });
                });
            }
        }, 1000);

    } catch (e: any) {
        console.error("Screen share failed", e);
        // Don't alert if user just cancelled the dialog
        if (e.name !== 'NotAllowedError') {
             alert(`Failed to start screen share: ${e.message || e}`);
        }
        stopScreenShare();
    } finally {
        setIsSharingLoading(false);
    }
  };

  const stopSession = () => {
    stopScreenShare();

    // 1. Stop Audio Contexts
    if (inputContextRef.current) {
        inputContextRef.current.close();
        inputContextRef.current = null;
    }
    if (outputContextRef.current) {
        outputContextRef.current.close();
        outputContextRef.current = null;
    }

    // 2. Stop Processing
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }

    // 3. Stop all playing audio
    activeSourcesRef.current.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    activeSourcesRef.current.clear();

    // 4. Session handles clean disconnect automatically mostly, but we reset state
    
    setIsActive(false);
    setIsConnecting(false);
    setVolume(0);
    sessionRef.current = null;
  };

  const startSession = async () => {
    if (!process.env.API_KEY) {
        alert("Please set your API Key to use the Live Tutor.");
        return;
    }

    setIsConnecting(true);

    try {
        // --- 1. Audio Setup ---
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Input Context (16kHz for Gemini)
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        inputContextRef.current = inputCtx;
        
        // Output Context (24kHz for Gemini response)
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputContextRef.current = outputCtx;
        nextStartTimeRef.current = outputCtx.currentTime;

        const source = inputCtx.createMediaStreamSource(stream);
        inputSourceRef.current = source;

        // Processor
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(inputCtx.destination);

        // --- 2. Gemini Connection ---
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: `You are a friendly, encouraging Computer Science Professor and Tutor. 
                The user is currently working on code in ${language}.
                
                CODE CONTEXT:
                ${code}

                CAPABILITIES:
                1. The user may share their screen. If you receive image frames, use them to see the 'Omni-Code-Visualizer'.
                2. Explain the data structures (Arrays, Trees) you see in the visualization.
                3. Help debug based on the visual flow and the code.
                
                Keep answers relatively concise and conversational.`,
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                }
            },
            callbacks: {
                onopen: () => {
                    console.log("Live Session Connected");
                    setIsActive(true);
                    setIsConnecting(false);
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Handle Audio Output
                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    
                    if (base64Audio && outputContextRef.current) {
                        const ctx = outputContextRef.current;
                        const audioData = base64Decode(base64Audio);
                        const audioBuffer = pcmToAudioBuffer(audioData, ctx, 24000);

                        // Schedule playback
                        const source = ctx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(ctx.destination);
                        
                        // Ensure smooth playback without gaps
                        const currentTime = ctx.currentTime;
                        if (nextStartTimeRef.current < currentTime) {
                            nextStartTimeRef.current = currentTime;
                        }
                        
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        
                        activeSourcesRef.current.add(source);
                        source.onended = () => activeSourcesRef.current.delete(source);

                        // Simple visualizer effect based on incoming data size
                        setVolume(Math.min(100, audioData.length / 10));
                        setTimeout(() => setVolume(0), audioBuffer.duration * 1000);
                    }

                    // Handle Interruption (User spoke while AI was speaking)
                    if (message.serverContent?.interrupted) {
                        activeSourcesRef.current.forEach(s => s.stop());
                        activeSourcesRef.current.clear();
                        if (outputContextRef.current) {
                            nextStartTimeRef.current = outputContextRef.current.currentTime;
                        }
                    }
                },
                onclose: () => {
                    console.log("Session Closed");
                    stopSession();
                },
                onerror: (err) => {
                    console.error("Live Session Error", err);
                    stopSession();
                }
            }
        });

        sessionRef.current = sessionPromise;

        // --- 3. Stream Input ---
        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Calculate volume for visualizer
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            if (!outputContextRef.current || activeSourcesRef.current.size === 0) {
                 // Only show mic volume if AI isn't speaking
                 setVolume(rms * 500); 
            }

            const pcmBlob = createAudioBlob(inputData);
            
            sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
            });
        };

    } catch (error) {
        console.error("Failed to start live session:", error);
        stopSession();
    }
  };

  const toggleSession = () => {
    if (isActive || isConnecting) {
        stopSession();
    } else {
        startSession();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="flex items-center gap-2">
        {/* Hidden Video Elements for Capture */}
        <video ref={videoRef} className="hidden" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {isActive && (
            <button
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                disabled={isSharingLoading}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
                    isScreenSharing 
                        ? 'bg-blue-900/30 text-blue-300 border-blue-500/50' 
                        : isSharingLoading
                        ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-wait'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title={isScreenSharing ? "Stop sharing screen" : "Share screen with Tutor"}
            >
                {isSharingLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : isScreenSharing ? (
                    <StopCircle size={16} />
                ) : (
                    <Monitor size={16} />
                )}
                <span className="hidden sm:inline">
                    {isSharingLoading ? 'Initializing...' : isScreenSharing ? 'Stop Share' : 'Share Screen'}
                </span>
            </button>
        )}

        <button
            onClick={toggleSession}
            disabled={isConnecting}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
                isActive 
                ? 'bg-red-900/30 text-red-300 border-red-500/50 animate-pulse' 
                : isConnecting
                ? 'bg-yellow-900/30 text-yellow-300 border-yellow-500/50'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            >
            {isActive ? (
                <>
                    <div className="relative flex items-center justify-center w-4 h-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <Mic size={16} />
                    </div>
                    <span>Live Tutor</span>
                    {/* Audio Visualizer Bar */}
                    <div className="flex gap-0.5 items-end h-4 ml-2">
                        {[1, 2, 3].map(i => (
                            <div 
                                key={i} 
                                className="w-1 bg-red-400 rounded-t-sm transition-all duration-75" 
                                style={{ height: `${Math.min(100, Math.max(20, volume * (i * 0.5 + 0.5)))}%` }}
                            />
                        ))}
                    </div>
                </>
            ) : isConnecting ? (
                <>
                    <Radio size={16} className="animate-spin" />
                    <span>Connecting...</span>
                </>
            ) : (
                <>
                    <Volume2 size={16} className="text-slate-400" />
                    <span>Start Voice Tutor</span>
                </>
            )}
        </button>
    </div>
  );
};

export default LiveTutor;