import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Copy, Check, MessageSquare, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { askGemini } from '../services/geminiService';
import { GoogleGenAI } from '@google/genai';
import { getApiKey } from '../utils/apiKey';

interface AIAssistantProps {
  code: string;
  language: string;
  onApplyCode: (newCode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  image?: string; // Base64 image
}

const AIAssistant: React.FC<AIAssistantProps> = ({ code, language, onApplyCode, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Hello! I am Gemini. I can help you explain, fix, or optimize your code. How can I help?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleCaptureScreen = async (): Promise<string | null> => {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1280, height: 720 },
            audio: false
        });
        
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();

        // Wait a moment for frame
        await new Promise(r => setTimeout(r, 500));
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        
        // Stop stream immediately
        stream.getTracks().forEach(t => t.stop());
        video.remove();
        canvas.remove();

        return base64;
    } catch (e) {
        console.error("Snapshot failed", e);
        return null;
    }
  };

  const handleSend = async (screenshotBase64?: string) => {
    if ((!input.trim() && !screenshotBase64) || isLoading) return;

    const apiKey = getApiKey();
    if (!apiKey) {
        setMessages(prev => [...prev, { role: 'ai', content: "Please configure your API Key in Settings to use the Assistant." }]);
        return;
    }

    const userMsg = input;
    setInput('');
    
    // Add User Message
    setMessages(prev => [...prev, { 
        role: 'user', 
        content: userMsg,
        image: screenshotBase64 
    }]);
    
    setIsLoading(true);

    try {
        // We handle the API call here directly to support images, 
        // effectively overriding the simpler 'askGemini' service for this multimodal case.
        const ai = new GoogleGenAI({ apiKey });
        
        const parts: any[] = [];
        if (screenshotBase64) {
            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: screenshotBase64
                }
            });
            parts.push({ text: "I have shared a screenshot of my current screen/visualizer." });
        }
        
        parts.push({ 
            text: `
            CURRENT CODE CONTEXT:
            \`\`\`${language}
            ${code}
            \`\`\`
            
            USER QUESTION:
            ${userMsg}
            ` 
        });

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts },
            config: {
                systemInstruction: "You are a helpful coding assistant. You can see code and screenshots provided by the user."
            }
        });

        const text = response.text || "No response generated.";
        setMessages(prev => [...prev, { role: 'ai', content: text }]);

    } catch (error) {
        console.error("Error", error);
        setMessages(prev => [...prev, { role: 'ai', content: "Sorry, something went wrong. Please check your API key." }]);
    } finally {
        setIsLoading(false);
    }
  };

  const onSnapshotAndSend = async () => {
      const base64 = await handleCaptureScreen();
      if (base64) {
          handleSend(base64);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper to render message content with code block detection
  const renderContent = (content: string) => {
    // Simple regex to split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith('```')) {
        // Extract code content, removing first line (```lang) and last line (```)
        const lines = part.split('\n');
        const codeBlock = lines.slice(1, -1).join('\n');
        
        return (
          <div key={idx} className="my-3 rounded-md overflow-hidden border border-slate-700 bg-slate-950">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800">
              <span className="text-xs text-slate-500 font-mono">Generated Code</span>
              <button 
                onClick={() => onApplyCode(codeBlock)}
                className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors"
                title="Replace editor content"
              >
                <Check size={12} /> Apply
              </button>
            </div>
            <pre className="p-3 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
              {codeBlock}
            </pre>
          </div>
        );
      }
      return <span key={idx} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-14 right-0 bottom-0 w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 shadow-2xl z-30 flex flex-col"
        >
          {/* Header */}
          <div className="h-12 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-2 text-blue-400 font-semibold">
              <Sparkles size={16} />
              <span>Gemini Assistant</span>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    
                    {msg.image && (
                        <div className="w-48 h-28 bg-black rounded-lg border border-slate-600 overflow-hidden mb-1 relative">
                            <img src={`data:image/jpeg;base64,${msg.image}`} alt="Screen Context" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-1 right-1 text-[9px] bg-black/50 px-1 rounded text-white font-mono">Screen Snapshot</div>
                        </div>
                    )}

                    <div 
                    className={`rounded-lg p-3 text-sm ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                    >
                    {renderContent(msg.content)}
                    </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex gap-1">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
             {/* Quick Actions */}
             {messages.length < 3 && (
                 <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                    {['Explain Code', 'Find Bugs', 'Optimize'].map(action => (
                        <button 
                            key={action}
                            onClick={() => { setInput(action); }}
                            className="whitespace-nowrap px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-xs text-slate-400 transition-colors"
                        >
                            {action}
                        </button>
                    ))}
                 </div>
             )}

             <div className="relative flex gap-2">
                 <button
                    onClick={onSnapshotAndSend}
                    title="Take screenshot and attach"
                    disabled={isLoading}
                    className="flex items-center justify-center p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-blue-400 hover:border-blue-500 transition-colors"
                 >
                    <Monitor size={18} />
                 </button>

                <div className="relative flex-1">
                    <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Gemini..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none h-12 scrollbar-hide"
                    />
                    <button 
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 top-2.5 p-1.5 text-blue-500 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                    <Send size={16} />
                    </button>
                </div>
             </div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIAssistant;