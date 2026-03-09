import { useState, useRef, useEffect } from 'react';
import { Send, Settings, X, Bot, User, Loader2, Sparkles, Download, AlertCircle, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initProgress, setInitProgress] = useState("");
  const [initError, setInitError] = useState("");
  const workerRef = useRef<Worker | null>(null);

  const [context, setContext] = useState("You are a helpful and friendly AI assistant. You automatically detect the user's language and respond in the same language. Keep your answers concise and mobile-friendly.");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: 'Hello! I am running completely offline in your browser using ONNX. I am super lightweight (~350MB). How can I help?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e) => {
      const { type, data, error, text } = e.data;
      if (type === 'progress') {
        if (data.status === 'downloading') {
          setInitProgress(`Downloading ${data.file}... ${Math.round(data.progress || 0)}%`);
        } else if (data.status === 'loading') {
          setInitProgress(`Loading model into memory...`);
        } else if (data.status === 'ready') {
          setInitProgress(`Ready!`);
        } else if (data.status === 'init') {
          setInitProgress(`Initializing...`);
        }
      } else if (type === 'ready') {
        setIsReady(true);
        setIsInitializing(false);
      } else if (type === 'error') {
        setInitError(error);
        setIsInitializing(false);
        setIsLoading(false);
      } else if (type === 'complete') {
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
  }, []);

  const initializeEngine = () => {
    setIsInitializing(true);
    setInitError("");
    workerRef.current?.postMessage({ type: 'init' });
  };

  const handleSend = () => {
    if (!input.trim() || isLoading || !isReady) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const apiMessages = [
      { role: 'system', content: context },
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

  if (!isReady) {
    return (
      <div className="flex flex-col h-[100dvh] bg-zinc-50 text-zinc-900 font-sans sm:max-w-md sm:mx-auto sm:border-x sm:border-zinc-200 sm:shadow-2xl overflow-hidden items-center justify-center p-6 text-center relative">
        <div className="absolute top-6 right-6 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <WifiOff size={14} />
          Offline Ready
        </div>
        <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-6 shadow-sm">
          <Sparkles size={36} />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-3">Qwen 0.5B (ONNX)</h1>
        <p className="text-zinc-600 mb-8 text-[15px] leading-relaxed max-w-sm">
          This chatbot runs entirely in your browser using ONNX and WebGPU. 
          <br/><br/>
          It uses the ultra-lightweight Qwen1.5-0.5B-Chat model (~350MB), making it perfect for mobile devices with limited memory.
        </p>

        {initError ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-sm mb-6 flex items-start gap-3 text-left w-full max-w-sm border border-red-100">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <p>{initError}</p>
          </div>
        ) : null}

        {isInitializing ? (
          <div className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-center gap-3 text-indigo-600 font-medium">
              <Loader2 size={20} className="animate-spin" />
              <span>Loading Model...</span>
            </div>
            <p className="text-xs text-zinc-500 font-mono bg-zinc-100 p-3 rounded-xl break-words text-left h-24 overflow-y-auto border border-zinc-200 shadow-inner">
              {initProgress || "Initializing ONNX Runtime..."}
            </p>
          </div>
        ) : (
          <button
            onClick={initializeEngine}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 active:scale-95 w-full max-w-xs"
          >
            <Download size={20} />
            Download & Start
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-50 text-zinc-900 font-sans sm:max-w-md sm:mx-auto sm:border-x sm:border-zinc-200 sm:shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <WifiOff size={18} />
          </div>
          <div>
            <h1 className="font-semibold text-zinc-900 leading-tight">QwenBot</h1>
            <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              ONNX Offline
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
        >
          <Settings size={20} />
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 bg-zinc-50/50">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 shadow-sm ${
                  msg.role === 'user' ? 'bg-zinc-200 text-zinc-600' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20' 
                    : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm shadow-sm'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.text}</p>
                  ) : (
                    <div className="markdown-body prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-100 prose-pre:text-zinc-800 prose-a:text-indigo-600">
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
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mt-1 shadow-sm">
                  <Bot size={16} />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white border border-zinc-200 rounded-tl-sm shadow-sm flex items-center gap-3">
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                  <span className="text-sm font-medium text-zinc-500">Generating locally...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-2" />
      </main>

      {/* Input Area */}
      <footer className="p-3 bg-white border-t border-zinc-200 z-10 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="flex items-end gap-2 bg-zinc-100 rounded-3xl p-1.5 pl-4 border border-zinc-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100/50 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message QwenBot..."
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2.5 text-[15px] leading-tight text-zinc-900 placeholder:text-zinc-500 outline-none"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-indigo-600 text-white disabled:bg-zinc-300 disabled:text-zinc-500 transition-colors flex items-center justify-center flex-shrink-0 mb-0.5 mr-0.5 shadow-sm"
          >
            <Send size={18} className={input.trim() && !isLoading ? "translate-x-0.5 -translate-y-0.5" : ""} />
          </button>
        </div>
      </footer>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-zinc-100">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Bot Context</h2>
                  <p className="text-xs text-zinc-500">Configure persona & behavior</p>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors bg-zinc-50"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto">
                <p className="text-sm text-zinc-600 mb-5 leading-relaxed">
                  Define the persona, knowledge, and behavior of the chatbot. The bot will automatically detect your language and respond accordingly based on this context.
                </p>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-zinc-900">System Instruction</label>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="w-full h-48 p-4 rounded-2xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-[15px] leading-relaxed resize-none outline-none"
                    placeholder="e.g., You are a helpful travel guide for Paris..."
                  />
                </div>
                <div className="mt-8 mb-2">
                  <button
                    onClick={() => {
                      setMessages([{
                        id: Date.now().toString(),
                        role: 'model',
                        text: 'Context updated! How can I help you now?'
                      }]);
                      setIsSettingsOpen(false);
                    }}
                    className="w-full py-3.5 bg-zinc-900 text-white rounded-2xl font-medium hover:bg-zinc-800 transition-colors active:scale-[0.98] shadow-lg shadow-zinc-900/20"
                  >
                    Save & Reset Chat
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
