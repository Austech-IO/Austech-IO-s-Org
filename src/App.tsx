/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  Bot, 
  User, 
  Loader2, 
  Smartphone, 
  Monitor, 
  Cpu, 
  Sparkles, 
  Mic,
  MicOff,
  ChevronUp,
  ChevronDown,
  Trash2,
  Download,
  Copy,
  Check,
  Search,
  Paperclip,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark as theme } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { generateAIResponse, ChatMessage } from './lib/gemini.ts';
import { Mermaid } from './components/Mermaid.tsx';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  History, 
  Code2, 
  Wrench, 
  HelpCircle,
  Bug,
  Layout,
  Database,
  ArrowRightLeft
} from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'git'>('chat');
  const [gitHistory, setGitHistory] = useState<{ id: string; msg: string; date: string }[]>([
    { id: '4f2e1a', msg: 'initial architectural draft', date: '2 mins ago' },
    { id: '7d1a9c', msg: 'implemented core ai logic', date: 'Just now' }
  ]);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Reset search navigation when query changes
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          setMessages(prev => [...prev, { 
            role: 'model', 
            text: '⚠️ Microphone permission blocked. Please check your browser address bar permissions or try opening the app in a new tab.' 
          }]);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const toggleListening = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        // Prime microphone permission first - this often triggers the prompt 
        // more reliably in iframes than the SpeechRecognition API alone.
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err: any) {
        console.error('Failed to start speech recognition:', err);
        setIsListening(false);
        
        let errorMessage = 'Microphone access failed.';
        if (err.name === 'NotAllowedError' || err.message?.includes('not-allowed') || err.message?.includes('Permission denied')) {
          errorMessage = '⚠️ MICROPHONE ACCESS DENIED: Browser security is blocking the microphone within this frame. To use voice commands, please click the "Open in New Tab" button in the header or allow permissions in your address bar.';
        }
        
        setMessages(prev => [...prev, { 
          role: 'model', 
          text: errorMessage
        }]);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: input,
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setPreviewUrl(null);
    setIsLoading(true);

    try {
      const response = await generateAIResponse(input, messages, userMessage.image);
      const modelMessage: ChatMessage = {
        role: 'model',
        text: response
      };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: 'Error: Connection failed. Please check your API key and try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        setSelectedImage({ data: base64Data, mimeType: file.type });
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const exportChat = () => {
    if (messages.length === 0) return;

    const timestamp = new Date().toLocaleString();
    let content = `# Lumina AI Chat History\nExported on: ${timestamp}\n\n---\n\n`;

    messages.forEach((msg, index) => {
      const role = msg.role === 'user' ? 'USER' : 'LUMINA';
      content += `### ${role}\n`;
      if (msg.image) {
        content += `*[Image attached: ${msg.image.mimeType}]*\n\n`;
      }
      content += `${msg.text}\n\n`;
      content += `---\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumina-chat-${new Date().getTime()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const explainCode = (code: string) => {
    setInput(`Please explain this code snippet in detail, breaking down its logic and purpose:\n\n\`\`\`\n${code}\n\`\`\``);
  };

  const refactorCode = (code: string) => {
    setInput(`Please suggest refactoring improvements for this code to improve performance and readability:\n\n\`\`\`\n${code}\n\`\`\``);
  };

  const debugCode = (code: string) => {
    setInput(`I'm encountering an issue with this code. Please analyze it for potential bugs and provide a fix:\n\n\`\`\`\n${code}\n\`\`\``);
  };

  const commitChat = () => {
    const lastMsg = messages[messages.length - 1]?.text || 'manual snapshot';
    const id = Math.random().toString(16).substring(2, 8);
    setGitHistory(prev => [{ id, msg: lastMsg.substring(0, 30) + '...', date: 'Just now' }, ...prev]);
  };

  const navigateMatch = (direction: 'next' | 'prev') => {
    if (filteredMessages.length === 0) return;
    
    let nextIndex = currentMatchIndex;
    if (direction === 'next') {
      nextIndex = (currentMatchIndex + 1) % filteredMessages.length;
    } else {
      nextIndex = (currentMatchIndex - 1 + filteredMessages.length) % filteredMessages.length;
    }
    
    setCurrentMatchIndex(nextIndex);
    const element = document.getElementById(`message-card-${nextIndex}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const filteredMessages = searchQuery.trim() 
    ? messages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-orange-500/30">
      {/* Navigation Header */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-amber-300 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Cpu className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">LUMINA <span className="text-orange-500 text-xs font-mono ml-1">KERNEL</span></h1>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-semibold">Architect Mode</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${
                activeTab === 'chat' ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-white/40 hover:text-white'
              }`}
            >
              Console
            </button>
            <button 
              onClick={() => setActiveTab('git')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${
                activeTab === 'git' ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-white/40 hover:text-white'
              }`}
            >
              VCS Control
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <a 
            href={window.location.origin} 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-white/40 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
          >
            <Monitor className="w-3 h-3" /> External Link
          </a>
          <AnimatePresence>
            {isSearchActive && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="relative hidden md:flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search history..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs outline-none focus:border-orange-500/50 transition-all font-mono"
                    autoFocus
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                {searchQuery && filteredMessages.length > 0 && (
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-1 py-0.5 shrink-0">
                    <span className="text-[10px] font-mono text-white/40 px-2 border-r border-white/10">
                      {currentMatchIndex + 1}/{filteredMessages.length}
                    </span>
                    <button 
                      onClick={() => navigateMatch('prev')}
                      className="p-1 text-white/40 hover:text-white transition-colors"
                      title="Previous Match"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => navigateMatch('next')}
                      className="p-1 text-white/40 hover:text-white transition-colors"
                      title="Next Match"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => {
              setIsSearchActive(!isSearchActive);
              if (isSearchActive) setSearchQuery('');
            }}
            className={`p-2 rounded-lg transition-colors group ${isSearchActive ? 'bg-orange-500/20 text-orange-400' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            title="Search Messages"
          >
            <Search className="w-5 h-5" />
          </button>
          
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] text-white/30 uppercase font-mono">System Status</span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" /> ONLINE
            </span>
          </div>
          <button 
            onClick={exportChat}
            disabled={messages.length === 0}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-orange-400 disabled:opacity-30 disabled:hover:bg-transparent group"
            title="Export Chat"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={clearChat}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-red-400 group"
            title="Clear Chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex w-full max-w-7xl mx-auto overflow-hidden relative">
        {/* Sidebar for VCS (if active) */}
        <AnimatePresence>
          {activeTab === 'git' && (
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="w-72 border-r border-white/10 bg-[#0A0A0A] p-6 hidden lg:flex flex-col gap-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">Source Control</h3>
                  <GitBranch className="w-4 h-4 text-orange-500" />
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-white/60">main*</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Synced</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-orange-500" />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                <div className="flex items-center gap-2 text-white/40 px-2">
                  <History className="w-3 h-3" />
                  <span className="text-[10px] uppercase font-mono tracking-wider">Commit Timeline</span>
                </div>
                {gitHistory.map((item, idx) => (
                  <div key={idx} className="group cursor-pointer">
                    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all">
                      <GitCommit className="w-4 h-4 text-orange-500/40 group-hover:text-orange-500 mt-1" />
                      <div>
                        <p className="text-[11px] font-mono text-white/80 line-clamp-1">{item.msg}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-mono text-white/30">{item.id}</span>
                          <span className="text-[9px] font-mono text-white/20">• {item.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={commitChat}
                className="w-full py-3 bg-orange-500 text-black text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <GitPullRequest className="w-4 h-4" /> Finalize Snapshot
              </button>
            </motion.aside>
          )}
        </AnimatePresence>

        <section className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-8 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 pt-20">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-orange-500 blur-3xl opacity-10 rounded-full" />
                  <Sparkles className="w-16 h-16 text-orange-500 relative z-10" />
                </motion.div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-light tracking-tight text-white/90">Lumina Architectural Intelligence</h2>
                  <p className="text-white/40 text-sm max-w-md mx-auto">
                    Generate microservices diagrams, refactor complex kernels, or debug system-level logic with real-time analysis.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg mt-8">
                  {[
                    { text: "System Architecture: Microservices", icon: Monitor },
                    { text: "Refactor: React Hook optimization", icon: Cpu },
                    { text: "Schema: Database ER Diagram", icon: GitBranch },
                    { text: "Debug: Connection pool leak", icon: Bug }
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(item.text)}
                      className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:bg-white/10 transition-all group flex items-start gap-3"
                    >
                      <item.icon className="w-5 h-5 text-orange-400/70 group-hover:text-orange-400 transition-colors mt-1" />
                      <span className="text-sm font-medium text-white/70 group-hover:text-white">{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence>
              {isSearchActive && searchQuery && filteredMessages.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-10 text-center"
                >
                  <div className="text-white/20 text-sm font-mono uppercase tracking-widest mb-2">No matching records found</div>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-orange-500 text-xs hover:underline"
                  >
                    Clear search parameters
                  </button>
                </motion.div>
              )}

              {filteredMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  id={`message-card-${i}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className={`flex gap-4 p-2 rounded-3xl transition-colors ${
                    isSearchActive && searchQuery && currentMatchIndex === i 
                    ? 'bg-orange-500/10 ring-1 ring-orange-500/30' 
                    : ''
                  } ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                    msg.role === 'user' ? 'bg-orange-500' : 'bg-white/10 border border-white/20'
                  }`}>
                    {msg.role === 'user' ? <User className="text-black w-6 h-6" /> : <Bot className="text-orange-400 w-6 h-6" />}
                  </div>
                  
                  <div className={`max-w-[85%] space-y-3 relative group/message ${msg.role === 'user' ? 'text-right' : ''}`}>
                    {msg.image && (
                      <div className={`rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative inline-block ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                        <img src={`data:${msg.image.mimeType};base64,${msg.image.data}`} alt="Shared" className="max-h-64 object-contain" />
                      </div>
                    )}
                    <div className={`p-5 rounded-2xl text-[15px] leading-relaxed relative ${
                      msg.role === 'user' 
                        ? 'bg-white/5 border border-white/10 text-white shadow-xl' 
                        : 'bg-white/10 border border-white/20 text-white/90 shadow-2xl backdrop-blur-sm'
                    }`}>
                      {/* Copy Button */}
                      <button
                        onClick={() => copyToClipboard(msg.text, i)}
                        className="absolute top-3 right-3 p-2 bg-black/50 border border-white/10 rounded-lg opacity-0 group-hover/message:opacity-100 transition-all hover:bg-black/70 flex items-center gap-2"
                        title="Copy message"
                      >
                        {copiedIndex === i ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-white/60" />
                        )}
                      </button>

                      <div className="markdown-body">
                        <ReactMarkdown
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              const codeString = String(children).replace(/\n$/, '');

                              if (match && match[1] === 'mermaid') {
                                return <Mermaid chart={codeString} />;
                              }

                              return !inline && match ? (
                                <div className="relative group/code my-4">
                                  <div className="absolute right-3 top-3 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity flex gap-2">
                                    <button
                                      onClick={() => explainCode(codeString)}
                                      className="px-2 py-1 bg-black/80 hover:bg-black border border-white/10 rounded-md text-[9px] font-mono text-white/40 hover:text-white transition-all flex items-center gap-1"
                                      title="Explain Code"
                                    >
                                      <HelpCircle className="w-3 h-3" /> EXPLAIN
                                    </button>
                                    <button
                                      onClick={() => refactorCode(codeString)}
                                      className="px-2 py-1 bg-black/80 hover:bg-black border border-white/10 rounded-md text-[9px] font-mono text-white/40 hover:text-white transition-all flex items-center gap-1"
                                      title="Suggest Refactor"
                                    >
                                      <Wrench className="w-3 h-3" /> REFACTOR
                                    </button>
                                    <button
                                      onClick={() => debugCode(codeString)}
                                      className="px-2 py-1 bg-black/80 hover:bg-black border border-white/10 rounded-md text-[9px] font-mono text-white/40 hover:text-white transition-all flex items-center gap-1"
                                      title="Debug Context"
                                    >
                                      <Bug className="w-3 h-3" /> DEBUG
                                    </button>
                                    <div className="w-[1px] bg-white/10 mx-1" />
                                    <button
                                      onClick={() => copyToClipboard(codeString, i)}
                                      className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-white/40 hover:text-white transition-all shadow-xl"
                                      title="Copy Code"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="absolute left-3 top-3 z-10 opacity-40 text-[9px] font-mono uppercase tracking-widest text-white">
                                    {match[1]}
                                  </div>
                                  <SyntaxHighlighter
                                    style={theme}
                                    language={match[1]}
                                    PreTag="div"
                                    className="rounded-xl border border-white/10 !bg-black/80 !p-4 !pt-10 !m-0"
                                    {...props}
                                  >
                                    {codeString}
                                  </SyntaxHighlighter>
                                </div>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-4"
                >
                  <motion.div 
                    animate={{ 
                      rotate: [0, 90, 180, 270, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity, 
                      ease: "linear" 
                    }}
                    className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center"
                  >
                    <Bot className="text-orange-400/50 w-6 h-6" />
                  </motion.div>
                  <div className="bg-white/10 border border-white/20 p-5 rounded-2xl flex flex-col gap-2 min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <motion.div 
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                          className="w-2 h-2 bg-orange-500 rounded-full" 
                        />
                        <motion.div 
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                          className="w-2 h-2 bg-orange-500 rounded-full" 
                        />
                        <motion.div 
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                          className="w-2 h-2 bg-orange-500 rounded-full" 
                        />
                      </div>
                      <span className="text-xs text-white/40 font-mono italic">Architecting...</span>
                    </div>
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="h-[1px] bg-gradient-to-r from-orange-500/0 via-orange-500/50 to-orange-500/0"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Console / Input Area */}
          <div className="mt-6 relative">
            <AnimatePresence>
              {previewUrl && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  className="absolute bottom-full left-0 mb-4 p-2 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl flex items-center gap-4 z-40"
                >
                  <div className="relative group">
                    <img src={previewUrl} alt="Preview" className="w-20 h-20 object-cover rounded-xl" />
                    <button 
                      onClick={() => { setPreviewUrl(null); setSelectedImage(null); }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="pr-4">
                    <p className="text-xs font-mono text-white/60">Image Payload Ready</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-tighter">Multipart/form-data</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-[#111111] border border-white/10 rounded-[2rem] p-2 pr-4 pl-4 flex flex-col gap-2 shadow-2xl focus-within:border-orange-500/50 transition-all duration-300">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-1">
                <button 
                  onClick={() => setInput("Generate a detailed high-level architecture diagram for a system that includes: ")}
                  className="px-2 py-1 hover:bg-white/5 rounded-md text-[9px] font-mono text-white/30 hover:text-orange-400 transition-all flex items-center gap-1.5"
                >
                  <Layout className="w-3 h-3" /> ARCHITECTURE
                </button>
                <button 
                  onClick={() => setInput("Describe a database schema (Mermaid ER diagram) for: ")}
                  className="px-2 py-1 hover:bg-white/5 rounded-md text-[9px] font-mono text-white/30 hover:text-orange-400 transition-all flex items-center gap-1.5"
                >
                  <Database className="w-3 h-3" /> DATABASE ERD
                </button>
                <button 
                  onClick={() => setInput("Provide a sequence diagram for the following data flow: ")}
                  className="px-2 py-1 hover:bg-white/5 rounded-md text-[9px] font-mono text-white/30 hover:text-orange-400 transition-all flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3 h-3" /> SEQUENCE FLOW
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 hover:bg-white/5 rounded-full text-white/40 hover:text-orange-400 transition-colors relative group"
                >
                  <Paperclip className="w-5 h-5" />
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
                    Attach Media
                  </div>
                </button>

                <button 
                  onClick={toggleListening}
                  className={`p-3 rounded-full transition-all relative group ${
                    isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-white/5 text-white/40 hover:text-orange-400'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
                    {isListening ? 'Stop Listening' : 'Voice Input'}
                  </div>
                </button>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*"
                />

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Describe your system architecture or logic..."
                  className="flex-1 bg-transparent border-none outline-none text-[15px] placeholder:text-white/20 py-4"
                />

                <button
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className={`p-3 rounded-2xl transition-all flex items-center gap-2 ${
                    isLoading || (!input.trim() && !selectedImage)
                      ? 'bg-white/5 text-white/10'
                      : 'bg-orange-500 text-black hover:bg-orange-400 active:scale-95 shadow-lg shadow-orange-500/20'
                  }`}
                >
                  <span className="text-xs font-bold hidden md:inline ml-1 uppercase tracking-tight">Execute</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3 px-4">
              <div className="flex gap-4">
                <span className="text-[9px] text-white/20 font-mono flex items-center gap-1 uppercase tracking-widest">
                  <div className="w-1 h-1 bg-orange-500/40 rounded-full" /> CTRL+ENTER to send
                </span>
                <span className="text-[9px] text-white/20 font-mono flex items-center gap-1 uppercase tracking-widest">
                  <div className="w-1 h-1 bg-orange-500/40 rounded-full" /> ARCHITECT v2.1
                </span>
              </div>
              <p className="text-[9px] text-white/20 font-mono uppercase tracking-[0.3em]">
                Lumina Kernel 0.5.0
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Decorative Elements */}
      <div className="fixed top-1/4 -left-64 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="fixed bottom-1/4 -right-64 w-[500px] h-[500px] bg-amber-500/5 blur-[120px] pointer-events-none rounded-full" />
    </div>
  );
}

