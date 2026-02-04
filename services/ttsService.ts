import { GoogleGenAI, Modality } from "@google/genai";
import { base64Decode, pcmToAudioBuffer } from './audioUtils';
import { getApiKey } from "../utils/apiKey";

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentPlaybackId = 0; // Token to track the latest playback request

// Initialize AudioContext lazily using system defaults to avoid resampling artifacts
const getAudioContext = () => {
    if (!audioContext) {
        // Do NOT force sampleRate here. Let the browser use the hardware native rate (e.g. 44.1k or 48k).
        // Forcing it can cause robotic/glitchy audio on some systems.
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
};

export const stopTTS = () => {
    // Increment ID to invalidate any pending async operations (fetch or decode)
    currentPlaybackId++;
    
    if (currentSource) {
        try {
            currentSource.stop();
            currentSource.disconnect();
        } catch (e) {
            // Ignore if already stopped
        }
        currentSource = null;
    }
};

/**
 * Plays text-to-speech.
 * Returns true if playback completed successfully (or skipped due to error).
 * Returns false ONLY if playback was explicitly interrupted/cancelled by a newer request or stop command.
 */
export const playTTS = async (text: string): Promise<boolean> => {
    const apiKey = getApiKey();
    if (!apiKey) return true; // Fail open if no key (simulate success to keep loop moving)
    if (!text) return true;

    // 1. Setup new playback ID
    const myPlaybackId = ++currentPlaybackId;
    
    // Stop any physically playing audio immediately
    if (currentSource) {
        try { currentSource.stop(); } catch(e) {}
        currentSource = null;
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
        // 2. Async Network Request
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        // 'Fenrir' is often deeper and more natural for narration than Puck.
                        prebuiltVoiceConfig: { voiceName: 'Fenrir' }, 
                    },
                },
            },
        });

        // CHECK: Has a new request started while we were fetching?
        if (myPlaybackId !== currentPlaybackId) return false;

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) return true; // Treat empty audio as success to continue loop

        // 3. Audio Decoding
        const ctx = getAudioContext();
        const audioData = base64Decode(base64Audio);
        
        // We explicitly tell the buffer that the Source Data is 24kHz.
        // The context (system default) will handle resampling nicely.
        const audioBuffer = pcmToAudioBuffer(audioData, ctx, 24000); 

        // CHECK: Has a new request started while we were decoding?
        if (myPlaybackId !== currentPlaybackId) return false;

        return new Promise((resolve) => {
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            
            currentSource = source;

            source.onended = () => {
                // Only resolve true if we finished naturally (ID hasn't changed)
                // If ID changed, it means we were cut off, but onended still fires.
                if (currentPlaybackId === myPlaybackId) {
                    currentSource = null;
                    resolve(true);
                } else {
                    resolve(false);
                }
            };

            source.start();
        });

    } catch (error) {
        console.error("TTS Error:", error);
        // Fail open: If error occurred but NOT interrupted, return true so the visualizer loop continues
        if (myPlaybackId === currentPlaybackId) return true;
        return false;
    }
};
