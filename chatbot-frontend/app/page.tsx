'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Bot, Loader2, Menu, Plus, MessageSquare, Copy, Check, PanelLeftClose, LogOut, Edit2, Trash2, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import typescript from 'react-syntax-highlighter/dist/cjs/languages/hljs/typescript';
import javascript from 'react-syntax-highlighter/dist/cjs/languages/hljs/javascript';
import php from 'react-syntax-highlighter/dist/cjs/languages/hljs/php';
import python from 'react-syntax-highlighter/dist/cjs/languages/hljs/python';
import bash from 'react-syntax-highlighter/dist/cjs/languages/hljs/bash';
import json from 'react-syntax-highlighter/dist/cjs/languages/hljs/json';
import css from 'react-syntax-highlighter/dist/cjs/languages/hljs/css';
import markdown from 'react-syntax-highlighter/dist/cjs/languages/hljs/markdown';
import xml from 'react-syntax-highlighter/dist/cjs/languages/hljs/xml';

SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('php', php);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('html', xml);

const CodeBlock = ({ language, value }: { language: string, value: string }) => {
  const [isCopied, setIsCopied] = useState(false);
  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  return (
    <div className="my-5 rounded-xl overflow-hidden ring-1 ring-slate-700/50 shadow-2xl bg-[#1E1E2E]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700 backdrop-blur-sm">
        <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-widest">{language}</span>
        <button onClick={copyToClipboard} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors">
          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {isCopied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
      <div className="overflow-x-auto max-w-full custom-scrollbar">
        <SyntaxHighlighter style={atomOneDark} language={language} PreTag="div" className="!m-0 !p-5 text-sm font-mono leading-relaxed">
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default function Chatbot() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<{ id?: number, sender: string; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<{ id: number; title: string }[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  // Daily Limits State
  const [limits, setLimits] = useState({ used: 0, limit: 20, remaining: 20 });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');
    if (!storedToken || !storedUser) {
      router.push('/login');
    } else {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      fetchSessions(storedToken);
      fetchLimit(storedToken);
    }
  }, [router]);

  useEffect(() => scrollToBottom(), [messages, isLoading]);

  const fetchLimit = async (authToken: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api'}/limit`, {
        headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setLimits(data);
      }
    } catch (error) { console.error("Failed to load limits"); }
  };

  const fetchSessions = async (authToken: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api'}/sessions`, {
        headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
      });
      if (res.ok) setSessions(await res.json());
    } catch (error) { console.error("Failed to load sessions"); }
  };

  const loadSessionMessages = async (sessionId: number) => {
    if (!token) return;
    setActiveSessionId(sessionId);
    setMessages([]);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api'}/sessions/${sessionId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.map((m: any) => ({ sender: m.sender, text: m.text })));
      }
    } catch (error) { console.error("Failed to load messages"); }
  };

  const startNewChat = () => { setActiveSessionId(null); setMessages([]); };

  const deleteChat = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api'}/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSessions(sessions.filter(s => s.id !== id));
        if (activeSessionId === id) startNewChat();
      }
    } catch (error) { console.error("Failed to delete chat"); }
  };

  const renameChat = async (id: number, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!editTitle.trim()) return setEditingSessionId(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api'}/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: editTitle })
      });
      if (res.ok) {
        setSessions(sessions.map(s => s.id === id ? { ...s, title: editTitle } : s));
        setEditingSessionId(null);
      }
    } catch (error) { console.error("Failed to rename chat"); }
  };

  const sendMessage = async () => {
    if (!input.trim() || !token || limits.remaining <= 0) return;

    const userMessage = input;
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api'}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage, session_id: activeSessionId }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { sender: 'ai', text: data.ai_response || "No response." }]);
        fetchLimit(token); // Refresh limit after sending
        if (!activeSessionId && data.session_id) {
          setActiveSessionId(data.session_id);
          fetchSessions(token);
        }
      } else {
        setMessages((prev) => [...prev, { sender: 'ai', text: 'Error: Connection lost.' }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { sender: 'ai', text: 'Error: Server is unreachable.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push('/login');
  };

  if (!user) return <div className="h-screen w-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      
      {/* Sidebar with Glassmorphism */}
      <aside className={`bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${sidebarOpen ? 'w-72' : 'w-0 hidden md:flex md:w-20'} relative z-20`}>
        <div className="p-5">
          <button onClick={startNewChat} className={`flex items-center gap-3 w-full p-3 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-100/50 text-indigo-700 rounded-2xl transition-all shadow-sm ${!sidebarOpen && 'md:justify-center md:p-3'}`}>
            <Plus className="w-5 h-5" />
            {sidebarOpen && <span className="font-bold text-sm">Start New Chat</span>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 custom-scrollbar">
          {sidebarOpen && <p className="text-[11px] font-extrabold text-slate-400 px-2 py-2 uppercase tracking-widest">Recent Chats</p>}
          {sessions.map((session) => (
            <div key={session.id} onClick={() => { if (editingSessionId !== session.id) loadSessionMessages(session.id); }} className={`group flex items-center justify-between w-full p-3 rounded-xl transition-all cursor-pointer ${activeSessionId === session.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-600 hover:bg-slate-100'}`}>
              <div className="flex items-center gap-3 overflow-hidden flex-1">
                <MessageSquare className={`w-4 h-4 shrink-0 ${activeSessionId === session.id ? 'text-indigo-200' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                {sidebarOpen && (
                  editingSessionId === session.id ? (
                    <input type="text" autoFocus className="flex-1 bg-white text-slate-900 border border-indigo-300 rounded px-2 py-0.5 text-sm outline-none font-medium" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={(e) => renameChat(session.id, e)} onKeyDown={(e) => e.key === 'Enter' && renameChat(session.id, e)} onClick={(e) => e.stopPropagation()} />
                  ) : (
                    <span className="text-sm font-medium truncate">{session.title}</span>
                  )
                )}
              </div>
              {sidebarOpen && editingSessionId !== session.id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setEditTitle(session.title); setEditingSessionId(session.id); }} className={`p-1.5 rounded-md transition-colors ${activeSessionId === session.id ? 'hover:bg-indigo-500 text-white' : 'text-slate-400 hover:text-indigo-600 hover:bg-white'}`}><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={(e) => deleteChat(session.id, e)} className={`p-1.5 rounded-md transition-colors ${activeSessionId === session.id ? 'hover:bg-indigo-500 text-white' : 'text-slate-400 hover:text-rose-600 hover:bg-white'}`}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar Footer User Profile */}
        <div className="p-4 m-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'md:justify-center w-full'}`}>
            {user.profile_image ? (
               <img src={user.profile_image} alt="User" className="w-10 h-10 rounded-full shadow-md object-cover ring-2 ring-indigo-50" />
            ) : (
               <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold ring-2 ring-indigo-50 shadow-md">
                  {user.name.charAt(0).toUpperCase()}
               </div>
            )}
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                <p className="text-xs text-indigo-500 font-semibold truncate">Nexus Pro</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button onClick={logout} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
               <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
           <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white/40 backdrop-blur-md border-b border-white/50 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 bg-white shadow-sm border border-slate-100 text-slate-500 hover:text-indigo-600 rounded-xl transition-all">
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-600 tracking-tight">Nexus AI</h1>
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-500 text-white text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold shadow-sm shadow-emerald-200">1.5 Flash</span>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth z-10 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-8 pb-10">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[65vh] text-center space-y-5 animate-in zoom-in-95 duration-500">
                <div className="relative">
                   <div className="absolute inset-0 bg-indigo-200 rounded-full filter blur-xl animate-pulse opacity-60"></div>
                   <div className="relative w-20 h-20 bg-gradient-to-tr from-white to-indigo-50 border border-white shadow-xl rounded-3xl flex items-center justify-center">
                     <Bot className="w-10 h-10 text-indigo-600" />
                   </div>
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Hello, {user.name.split(' ')[0]}!</h2>
                  <p className="text-slate-500 font-medium">How can I assist you with code or ideas today?</p>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="shrink-0 mt-1">
                  {msg.sender === 'user' ? (
                     user.profile_image ? (
                        <img src={user.profile_image} className="w-10 h-10 rounded-2xl shadow-md object-cover ring-1 ring-slate-200" alt="User" />
                     ) : (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md flex items-center justify-center text-white font-bold ring-1 ring-slate-200">
                           {user.name.charAt(0).toUpperCase()}
                        </div>
                     )
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 flex items-center justify-center border border-emerald-500 shadow-lg shadow-emerald-200">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>

                <div className={`flex-1 min-w-0 max-w-[85%] pt-1 ${msg.sender === 'user' ? 'flex justify-end' : ''}`}>
                  <div className={`prose prose-p:leading-relaxed max-w-none break-words text-[15px] p-5 rounded-3xl shadow-sm ${msg.sender === 'user' ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-sm' : 'bg-white/80 backdrop-blur-sm border border-slate-100 text-slate-800 rounded-tl-sm'}`}>
                    {msg.sender === 'user' ? (
                      <p className="font-medium">{msg.text}</p>
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({node, inline, className, children, ...props}: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                              <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                            ) : (
                              <code {...props} className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md text-[13px] font-mono font-bold">
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4 animate-in fade-in duration-300">
                <div className="shrink-0 mt-1">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-slate-100 p-5 rounded-3xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-[60px]">
                   <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce"></div>
                   <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                   <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Floating Input Area & Limits Badge */}
        <div className="p-4 pb-6 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC] to-transparent z-20">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            
            {/* Daily Limits Badge */}
            <div className={`mb-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md border ${limits.remaining <= 3 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-white/80 text-slate-500 border-slate-200/60'}`}>
               <Zap className={`w-3.5 h-3.5 ${limits.remaining <= 3 ? 'text-rose-500 animate-pulse' : 'text-amber-500'}`} />
               {limits.remaining} / {limits.limit} Prompts Remaining Today
            </div>

            <div className="relative w-full flex items-end gap-3 bg-white p-2.5 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/80 focus-within:ring-4 focus-within:ring-indigo-500/15 focus-within:border-indigo-400 transition-all duration-300">
              <textarea
                className="flex-1 max-h-48 p-3 ml-2 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none resize-none overflow-y-auto text-[15px] font-medium custom-scrollbar"
                placeholder={limits.remaining > 0 ? "Ask Nexus anything..." : "Daily limit reached. See you tomorrow!"}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={isLoading || limits.remaining <= 0}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim() || limits.remaining <= 0}
                className="p-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:hover:shadow-none transition-all duration-300 shrink-0 transform active:scale-95"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </div>
            <p className="text-center text-slate-400 text-xs mt-3 font-medium">AI generated content can be inaccurate. Please double-check important details.</p>
          </div>
        </div>
        
      </main>

      {/* Global CSS for Custom Scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}