import { useState, useEffect } from 'react';
import { Plus, Settings, Code, LayoutTemplate, Volume2, Globe, ArrowLeft, Copy, Check, Bot, Trash2, Moon, Sun, Monitor, PlayCircle, Download, Languages, RefreshCw } from 'lucide-react';
import { ChatbotConfig } from './types';
import ChatWidget from './components/ChatWidget';

export default function App() {
  const [bots, setBots] = useState<ChatbotConfig[]>(() => {
    const saved = localStorage.getItem('qwenbot_configs');
    return saved ? JSON.parse(saved) : [];
  });
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(Date.now());

  const [dashboardTheme, setDashboardTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('qwenbot_dashboard_theme') as any) || 'system';
  });

  useEffect(() => {
    localStorage.setItem('qwenbot_dashboard_theme', dashboardTheme);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (dashboardTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(dashboardTheme);
    }
  }, [dashboardTheme]);

  useEffect(() => {
    localStorage.setItem('qwenbot_configs', JSON.stringify(bots));
  }, [bots]);

  const createBot = () => {
    const newBot: ChatbotConfig = {
      id: Date.now().toString(),
      name: 'New Chatbot',
      domain: 'example.com',
      systemPrompt: 'You are a helpful customer support assistant for our company. Be polite and concise.',
      themeColor: '#4f46e5', // Indigo 600
      soundEnabled: true,
      createdAt: Date.now(),
      engineStartMode: 'click',
      themeMode: 'light',
      botIcon: '',
      fontFamily: 'Inter, sans-serif',
      fontColor: '',
      fontSize: 'text-sm',
      language: 'auto',
    };
    setBots([newBot, ...bots]);
    setEditingBotId(newBot.id);
  };

  const deleteBot = (id: string) => {
    setBots(bots.filter(b => b.id !== id));
  };

  const updateBot = (id: string, updates: Partial<ChatbotConfig>) => {
    setBots(bots.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const editingBot = bots.find(b => b.id === editingBotId);
  const currentBot = editingBot ? {
    engineStartMode: 'click',
    themeMode: 'light',
    botIcon: '',
    fontFamily: 'Inter, sans-serif',
    fontColor: '',
    fontSize: 'text-sm',
    language: 'auto',
    ...editingBot
  } as ChatbotConfig : null;

  const copyEmbedCode = () => {
    if (!currentBot) return;
    const code = `<script src="https://cdn.qwenbot.ai/widget.js" data-bot-id="${currentBot.id}"></script>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (editingBotId && currentBot) {
    return (
      <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex flex-col font-sans transition-colors">
        {/* Header */}
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40 transition-colors">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setEditingBotId(null)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{currentBot.name}</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Globe size={14} /> {currentBot.domain}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={copyEmbedCode}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              {copied ? <Check size={16} /> : <Code size={16} />}
              {copied ? 'Copied!' : 'Copy Embed Code'}
            </button>
          </div>
        </header>

        {/* Main Content Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Settings Form */}
          <div className="w-1/2 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 transition-colors">
            <div className="max-w-xl mx-auto space-y-8">
              
              {/* General */}
              <section>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                  <Settings size={18} className="text-zinc-400" /> General Settings
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Bot Name</label>
                    <input 
                      type="text" 
                      value={currentBot.name}
                      onChange={(e) => updateBot(currentBot.id, { name: e.target.value })}
                      className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Target Domain</label>
                    <input 
                      type="text" 
                      value={currentBot.domain}
                      onChange={(e) => updateBot(currentBot.id, { domain: e.target.value })}
                      placeholder="e.g., mycompany.com"
                      className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">The widget will only load on this domain to prevent unauthorized use.</p>
                  </div>
                </div>
              </section>

              <hr className="border-zinc-100 dark:border-zinc-800" />

              {/* AI Behavior */}
              <section>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                  <Bot size={18} className="text-zinc-400" /> AI Behavior
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">System Instructions</label>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Define the bot's persona, knowledge, and rules.</p>
                    <textarea 
                      value={currentBot.systemPrompt}
                      onChange={(e) => updateBot(currentBot.id, { systemPrompt: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-2"><Languages size={16}/> Default Language</label>
                    <select 
                      value={currentBot.language}
                      onChange={(e) => updateBot(currentBot.id, { language: e.target.value })}
                      className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="auto">Auto-detect</option>
                      <option value="English">English</option>
                      <option value="French">French</option>
                      <option value="Spanish">Spanish</option>
                      <option value="German">German</option>
                      <option value="Arabic">Arabic</option>
                    </select>
                  </div>
                </div>
              </section>

              <hr className="border-zinc-100 dark:border-zinc-800" />

              {/* Engine Loading */}
              <section>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                  <Download size={18} className="text-zinc-400" /> Engine Loading
                </h2>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Engine Start Mode</label>
                  <div className="flex gap-3">
                    <label className={`flex-1 flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all ${currentBot.engineStartMode === 'click' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
                      <input type="radio" name="engineStart" className="sr-only" checked={currentBot.engineStartMode === 'click'} onChange={() => updateBot(currentBot.id, { engineStartMode: 'click' })} />
                      <PlayCircle size={18} /> <span className="text-sm font-medium">On Click</span>
                    </label>
                    <label className={`flex-1 flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all ${currentBot.engineStartMode === 'background' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
                      <input type="radio" name="engineStart" className="sr-only" checked={currentBot.engineStartMode === 'background'} onChange={() => updateBot(currentBot.id, { engineStartMode: 'background' })} />
                      <Download size={18} /> <span className="text-sm font-medium">Background Load</span>
                    </label>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">Background load starts downloading the model immediately when the website loads. On Click waits for the user to open the chat.</p>
                </div>
              </section>

              <hr className="border-zinc-100 dark:border-zinc-800" />

              {/* Appearance & Sound */}
              <section>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                  <LayoutTemplate size={18} className="text-zinc-400" /> Appearance & Sound
                </h2>
                <div className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Widget Theme</label>
                      <select 
                        value={currentBot.themeMode}
                        onChange={(e) => updateBot(currentBot.id, { themeMode: e.target.value as any })}
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="light">Light Mode</option>
                        <option value="dark">Dark Mode</option>
                        <option value="auto">System Auto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Bot Icon (Emoji or URL)</label>
                      <input 
                        type="text" 
                        value={currentBot.botIcon}
                        onChange={(e) => updateBot(currentBot.id, { botIcon: e.target.value })}
                        placeholder="🤖 or https://..."
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Font Family</label>
                      <select 
                        value={currentBot.fontFamily}
                        onChange={(e) => updateBot(currentBot.id, { fontFamily: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      >
                        <option value="Inter, sans-serif">Inter</option>
                        <option value="Roboto, sans-serif">Roboto</option>
                        <option value="serif">Serif</option>
                        <option value="monospace">Monospace</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Font Size</label>
                      <select 
                        value={currentBot.fontSize}
                        onChange={(e) => updateBot(currentBot.id, { fontSize: e.target.value as any })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      >
                        <option value="text-sm">Small</option>
                        <option value="text-base">Medium</option>
                        <option value="text-lg">Large</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Brand Color</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={currentBot.themeColor}
                          onChange={(e) => updateBot(currentBot.id, { themeColor: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                        />
                        <input 
                          type="text" 
                          value={currentBot.themeColor}
                          onChange={(e) => updateBot(currentBot.id, { themeColor: e.target.value })}
                          className="w-24 px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm uppercase"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Text Color</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={currentBot.fontColor || '#18181b'}
                          onChange={(e) => updateBot(currentBot.id, { fontColor: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                        />
                        <button 
                          onClick={() => updateBot(currentBot.id, { fontColor: '' })}
                          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                        <Volume2 size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Sound Effects</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Play sounds on send and receive</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={currentBot.soundEnabled}
                        onChange={(e) => updateBot(currentBot.id, { soundEnabled: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              </section>

              <hr className="border-zinc-100 dark:border-zinc-800" />

              {/* Integration */}
              <section>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                  <Code size={18} className="text-zinc-400" /> Integration
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">Copy and paste this snippet into the <code>&lt;head&gt;</code> of your website.</p>
                <div className="relative">
                  <pre className="bg-zinc-900 text-zinc-300 p-4 rounded-xl text-sm overflow-x-auto font-mono">
                    <code>{`<script src="https://cdn.qwenbot.ai/widget.js" data-bot-id="${currentBot.id}"></script>`}</code>
                  </pre>
                  <button 
                    onClick={copyEmbedCode}
                    className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </section>

            </div>
          </div>

          {/* Right: Preview */}
          <div className="w-1/2 bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden flex flex-col items-center justify-center transition-colors">
            <div className="absolute top-6 left-6 flex items-center gap-3 z-10">
              <div className="bg-white dark:bg-zinc-800 px-4 py-2 rounded-full shadow-sm text-sm font-medium text-zinc-600 dark:text-zinc-300 flex items-center gap-2 transition-colors">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Live Preview
              </div>
              <button 
                onClick={() => setPreviewKey(Date.now())}
                className="bg-white dark:bg-zinc-800 px-3 py-2 rounded-full shadow-sm text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2"
                title="Restart Chat"
              >
                <RefreshCw size={14} /> Reset Chat
              </button>
            </div>
            
            {/* Mock Website Background */}
            <div className="w-[80%] h-[80%] bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col transition-colors">
              <div className="h-12 border-b border-zinc-100 dark:border-zinc-800 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="ml-4 bg-zinc-100 dark:bg-zinc-800 h-6 rounded-md flex-1 max-w-sm flex items-center px-3 text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                  https://{currentBot.domain}
                </div>
              </div>
              <div className="flex-1 p-8">
                <div className="w-1/3 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-6"></div>
                <div className="w-full h-4 bg-zinc-50 dark:bg-zinc-800/50 rounded mb-3"></div>
                <div className="w-5/6 h-4 bg-zinc-50 dark:bg-zinc-800/50 rounded mb-3"></div>
                <div className="w-4/6 h-4 bg-zinc-50 dark:bg-zinc-800/50 rounded mb-8"></div>
                
                <div className="grid grid-cols-3 gap-6">
                  <div className="h-32 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl"></div>
                  <div className="h-32 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl"></div>
                  <div className="h-32 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl"></div>
                </div>
              </div>
            </div>

            {/* The actual Chat Widget Preview */}
            <ChatWidget key={previewKey} config={currentBot} />
          </div>
        </div>
      </div>
    );
  }

  // Dashboard List View
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex font-sans transition-colors">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-colors">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Bot size={20} />
          </div>
          <span className="font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">QwenSaaS</span>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-lg font-medium">
            <LayoutTemplate size={18} />
            My Chatbots
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg font-medium transition-colors">
            <Settings size={18} />
            Account Settings
          </button>
        </nav>
        
        {/* Dashboard Theme Toggle */}
        <div className="mt-auto p-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            <button 
              onClick={() => setDashboardTheme('light')} 
              className={`flex-1 flex justify-center p-1.5 rounded-md transition-colors ${dashboardTheme === 'light' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
            >
              <Sun size={16} />
            </button>
            <button 
              onClick={() => setDashboardTheme('system')} 
              className={`flex-1 flex justify-center p-1.5 rounded-md transition-colors ${dashboardTheme === 'system' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
            >
              <Monitor size={16} />
            </button>
            <button 
              onClick={() => setDashboardTheme('dark')} 
              className={`flex-1 flex justify-center p-1.5 rounded-md transition-colors ${dashboardTheme === 'dark' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
            >
              <Moon size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">My Chatbots</h1>
              <p className="text-zinc-500 dark:text-zinc-400">Manage and deploy AI assistants for your clients.</p>
            </div>
            <button 
              onClick={createBot}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus size={18} />
              New Chatbot
            </button>
          </div>

          {bots.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 border-dashed">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot size={32} />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No chatbots yet</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm mx-auto">Create your first AI assistant to deploy on your website or client domains.</p>
              <button 
                onClick={createBot}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm mx-auto"
              >
                <Plus size={18} />
                Create Chatbot
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bots.map(bot => (
                <div key={bot.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg dark:hover:shadow-zinc-900/50 transition-shadow group flex flex-col cursor-pointer" onClick={() => setEditingBotId(bot.id)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm overflow-hidden" style={{ backgroundColor: bot.themeColor }}>
                      {bot.botIcon ? (
                        bot.botIcon.startsWith('http') ? (
                          <img src={bot.botIcon} className="w-full h-full object-cover" alt="icon" />
                        ) : (
                          <span className="text-2xl">{bot.botIcon}</span>
                        )
                      ) : (
                        <Bot size={24} />
                      )}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteBot(bot.id); }}
                      className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">{bot.name}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-6">
                    <Globe size={14} /> {bot.domain}
                  </p>
                  <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      Created {new Date(bot.createdAt).toLocaleDateString()}
                    </span>
                    <button 
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                    >
                      Configure <ArrowLeft size={14} className="rotate-180" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
