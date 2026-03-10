import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Download, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { ChatbotConfig } from '../types';

const playSound = (type: 'send' | 'receive', enabled: boolean) => {
  if (!enabled) return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'send') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export default function ChatWidget({ config }: { config: ChatbotConfig }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [progressData, setProgressData] = useState<any>(null);
  const [initError, setInitError] = useState("");
  const workerRef = useRef<Worker | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const getGreeting = (lang: string) => {
    switch (lang) {
      case 'French': return 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?';
      case 'Spanish': return '¡Hola! ¿Cómo puedo ayudarte hoy?';
      case 'German': return 'Hallo! Wie kann ich Ihnen heute helfen?';
      case 'Arabic': return 'مرحباً! كيف يمكنني مساعدتك اليوم؟';
      default: return 'Hello! How can I help you today?';
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: getGreeting(config.language)
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (config.themeMode === 'dark') setIsDarkMode(true);
    else if (config.themeMode === 'light') setIsDarkMode(false);
    else {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [config.themeMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e) => {
      const { type, data, error, text } = e.data;
      if (type === 'progress') {
        setProgressData(data);
      } else if (type === 'ready') {
        setIsReady(true);
        setIsInitializing(false);
      } else if (type === 'error') {
        setInitError(error);
        setIsInitializing(false);
        setIsLoading(false);
      } else if (type === 'complete') {
        playSound('receive', config.soundEnabled);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text: text || "I'm sorry, I couldn't generate a response."
        }]);
        setIsLoading(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [config.soundEnabled]);

  const initializeEngine = () => {
    if (isReady || isInitializing) return;
    setIsInitializing(true);
    setInitError("");
    workerRef.current?.postMessage({ type: 'init' });
  };

  useEffect(() => {
    if (config.engineStartMode === 'background' && !isReady && !isInitializing && !initError) {
      initializeEngine();
    }
  }, [config.engineStartMode, isReady, isInitializing, initError]);

  useEffect(() => {
    if (isOpen && config.engineStartMode === 'click' && !isReady && !isInitializing && !initError) {
      initializeEngine();
    }
  }, [isOpen, config.engineStartMode, isReady, isInitializing, initError]);

  const handleSend = () => {
    if (!input.trim() || isLoading || !isReady) return;

    playSound('send', config.soundEnabled);

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const langInstruction = config.language !== 'auto' ? `\n\nIMPORTANT: You must respond in the following language: ${config.language}` : '';

    const apiMessages = [
      { role: 'system', content: config.systemPrompt + langInstruction },
      ...messages.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text
      })),
      { role: 'user', content: userMessage.text }
    ];

    workerRef.current?.postMessage({ type: 'generate', messages: apiMessages });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const renderIcon = (size: number) => {
    if (!config.botIcon) return <Bot size={size} />;
    if (config.botIcon.startsWith('http')) return <img src={config.botIcon} alt="Bot" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
    return <span style={{ fontSize: size * 0.8, lineHeight: 1 }}>{config.botIcon}</span>;
  };

  return (
    <div className={`absolute bottom-6 right-6 z-50 flex flex-col items-end ${isDarkMode ? 'dark' : ''}`} style={{ fontFamily: config.fontFamily }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-[380px] h-[600px] max-h-[80vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <header 
              className="flex items-center justify-between px-4 py-3 text-white shadow-sm z-10"
              style={{ backgroundColor: config.themeColor }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  {renderIcon(18)}
                </div>
                <div>
                  <h3 className="font-semibold leading-tight">{config.name || 'Chatbot'}</h3>
                  <p className="text-[11px] font-medium text-white/80 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                    Online
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </header>

            {/* Chat Area */}
            {!isReady ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-zinc-900/50">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white mb-4 shadow-sm" style={{ backgroundColor: config.themeColor }}>
                  {config.botIcon ? renderIcon(32) : <Sparkles size={28} />}
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">AI Engine Offline</h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                  This chatbot runs locally in your browser. {config.engineStartMode === 'click' ? 'Download the AI model to start chatting.' : 'Downloading AI model...'}
                </p>
                
                {initError && (
                  <div className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 p-3 rounded-xl text-xs mb-4 text-left w-full border border-red-100 dark:border-red-500/20">
                    {initError}
                  </div>
                )}

                {isInitializing ? (
                  <div className="w-full space-y-4 bg-white dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <div className="flex items-center justify-between text-sm font-medium" style={{ color: config.themeColor }}>
                      <div className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        <span>{progressData?.status === 'downloading' ? 'Downloading Model...' : 'Initializing...'}</span>
                      </div>
                      {progressData?.progress !== undefined && progressData?.status === 'downloading' && (
                        <span className="text-xs font-bold">{Math.round(progressData.progress)}%</span>
                      )}
                    </div>
                    
                    {progressData?.status === 'downloading' ? (
                      <>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full transition-all duration-300 ease-out"
                            style={{ width: `${progressData.progress || 0}%`, backgroundColor: config.themeColor }}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                          <div className="flex flex-col">
                            <span className="uppercase tracking-wider opacity-70">File</span>
                            <span className="truncate" title={progressData.file}>{progressData.file || '...'}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="uppercase tracking-wider opacity-70">Speed</span>
                            <span>{progressData.speed ? `${(progressData.speed / 1024 / 1024).toFixed(1)} MB/s` : 'Calculating...'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="uppercase tracking-wider opacity-70">Model</span>
                            <span className="truncate" title={progressData.name}>{progressData.name || 'Qwen2.5-0.5B'}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="uppercase tracking-wider opacity-70">ETA</span>
                            <span>{progressData.eta ? `${Math.ceil(progressData.eta)}s` : '--'}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg break-words text-left border border-zinc-100 dark:border-zinc-800">
                        {progressData?.status === 'loading' ? 'Loading model into memory...' : 
                         progressData?.status === 'ready' ? 'Ready!' : 
                         progressData?.status === 'init' ? 'Initializing WebGPU/WASM...' : 'Preparing engine...'}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={initializeEngine}
                    className="flex items-center justify-center gap-2 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-md active:scale-95 w-full"
                    style={{ backgroundColor: config.themeColor }}
                  >
                    <Download size={18} />
                    {initError ? 'Retry Download' : 'Start Engine'}
                  </button>
                )}
              </div>
            ) : (
              <>
                <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-1 shadow-sm ${
                            msg.role === 'user' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300' : 'text-white'
                          }`} style={msg.role === 'model' ? { backgroundColor: config.themeColor } : {}}>
                            {msg.role === 'user' ? <User size={14} /> : renderIcon(14)}
                          </div>
                          <div className={`px-3 py-2 rounded-2xl ${config.fontSize} ${
                            msg.role === 'user' 
                              ? 'text-white rounded-tr-sm shadow-sm' 
                              : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-tl-sm shadow-sm'
                          }`} style={msg.role === 'user' ? { backgroundColor: config.themeColor } : { color: config.fontColor || undefined }}>
                            {msg.role === 'user' ? (
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                            ) : (
                              <div className="markdown-body prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-900 prose-pre:text-zinc-800 dark:prose-pre:text-zinc-200" style={{ color: config.fontColor || undefined }}>
                                <Markdown>{msg.text}</Markdown>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="flex gap-2 max-w-[85%]">
                          <div className="w-7 h-7 rounded-full text-white flex items-center justify-center mt-1 shadow-sm" style={{ backgroundColor: config.themeColor }}>
                            {renderIcon(14)}
                          </div>
                          <div className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-tl-sm shadow-sm flex items-center gap-2">
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Thinking</span>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="w-1 h-1 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-1 h-1 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-1 h-1 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={messagesEndRef} className="h-2" />
                </main>

                {/* Input Area */}
                <footer className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 z-10">
                  <div className="flex items-end gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-2xl p-1 pl-3 border border-zinc-200 dark:border-zinc-700 focus-within:border-zinc-300 dark:focus-within:border-zinc-600 focus-within:ring-2 focus-within:ring-zinc-100 dark:focus-within:ring-zinc-800 transition-all">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={handleInput}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading || !isReady}
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 text-[14px] leading-tight text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      rows={1}
                      style={{ minHeight: '36px', maxHeight: '100px' }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="w-8 h-8 rounded-full text-white disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:text-zinc-500 dark:disabled:text-zinc-500 transition-colors flex items-center justify-center flex-shrink-0 mb-0.5 mr-0.5 shadow-sm"
                      style={input.trim() && !isLoading ? { backgroundColor: config.themeColor } : {}}
                    >
                      <Send size={14} className={input.trim() && !isLoading ? "translate-x-0.5 -translate-y-0.5" : ""} />
                    </button>
                  </div>
                </footer>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        style={{ backgroundColor: config.themeColor }}
      >
        {isOpen ? <X size={24} /> : (config.botIcon ? renderIcon(24) : <MessageSquare size={24} />)}
      </button>
    </div>
  );
}
