'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUp, Loader2, Menu, SquarePen, Copy, Check, PanelLeftClose, PanelLeftOpen,
  LogOut, Pencil, Trash2, Sparkles, Sun, Moon, Code2, Lightbulb, PenLine, Bug, ChevronLeft, ChevronRight
} from 'lucide-react';
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

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api';

const SUGGESTIONS = [
  { icon: Code2, title: 'Write code', text: 'Write a Laravel controller for CRUD operations with validation' },
  { icon: Bug, title: 'Debug an error', text: 'Help me debug a 500 server error in my Laravel app' },
  { icon: Lightbulb, title: 'Project ideas', text: 'Give me 5 portfolio project ideas to impress recruiters' },
  { icon: PenLine, title: 'Explain a concept', text: 'Explain middleware in Laravel with a simple example' },
];

const CodeBlock = ({ language, value }: { language: string; value: string }) => {
  const [isCopied, setIsCopied] = useState(false);
  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/10 bg-[#282c34]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1f232a] text-xs text-zinc-400">
        <span className="font-mono">{language}</span>
        <button onClick={copyToClipboard} className="flex items-center gap-1.5 hover:text-white transition-colors">
          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {isCopied ? 'Copied' : 'Copy code'}
        </button>
      </div>
      <div className="overflow-x-auto max-w-full custom-scrollbar">
        <SyntaxHighlighter style={atomOneDark} language={language} PreTag="div" customStyle={{ margin: 0, padding: '16px', background: 'transparent', fontSize: '13.5px', lineHeight: 1.65 }}>
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const CopyButton = ({ text }: { text: string }) => {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); }} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors" title="Copy">
      {done ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
};

export default function Chatbot() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Tree Message States for < 1 / 2 > branches
  const [rawMessages, setRawMessages] = useState<any[]>([]);
  const [branchSelections, setBranchSelections] = useState<Record<string, number>>({});
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [sessions, setSessions] = useState<{ id: number; title: string, updated_at: string }[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  // Prompt Edit State
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editMsgText, setEditMsgText] = useState('');

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [limits, setLimits] = useState({ used: 0, limit: 100, remaining: 100 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Calculate Linear Thread from Tree Branches
  const currentThread = useMemo(() => {
    const thread = [];
    const roots = rawMessages.filter(m => !m.parent_id).sort((a, b) => a.id - b.id);
    if (roots.length === 0) return thread;

    let current = branchSelections['root'] ? rawMessages.find(m => m.id === branchSelections['root']) : roots[roots.length - 1];

    while (current) {
      thread.push(current);
      const children = rawMessages.filter(m => m.parent_id === current.id).sort((a, b) => a.id - b.id);
      if (children.length === 0) break;
      current = branchSelections[current.id] ? rawMessages.find(m => m.id === branchSelections[current.id]) : children[children.length - 1];
    }
    return thread;
  }, [rawMessages, branchSelections]);

  const updateURL = (chatId: number | null) => {
    if (chatId) window.history.pushState(null, '', `/?c=${chatId}`);
    else window.history.pushState(null, '', `/`);
  };

  useEffect(() => {
    const initializeApp = async () => {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');
      
      if (!storedToken || !storedUser) {
        window.location.href = '/login'; 
        return;
      }
      
      // Setting these variables immediately removes the white loading screen!
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      // Removed "await" to load APIs in background
      fetchLimit(storedToken);
      fetchSessions(storedToken);

      const params = new URLSearchParams(window.location.search);
      const chatIdParam = params.get('c');
      if (chatIdParam) loadSessionMessages(Number(chatIdParam), storedToken);
    };
    
    initializeApp();

    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) setTheme(savedTheme);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  useEffect(() => { scrollToBottom(); }, [currentThread, isLoading]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  const fetchLimit = async (authToken: string) => {
    try {
      const res = await fetch(`${API}/limit`, { headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' }, cache: 'no-store' });
      if (res.ok) setLimits(await res.json());
    } catch (error) { console.error('Failed to load limits'); }
  };

  const fetchSessions = async (authToken: string) => {
    try {
      const res = await fetch(`${API}/sessions`, { headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' }, cache: 'no-store' });
      if (res.ok) setSessions(await res.json());
    } catch (error) { console.error('Failed to load sessions'); }
  };

  const loadSessionMessages = async (sessionId: number, currentToken: string | null = token) => {
    if (!currentToken) return;
    setActiveSessionId(sessionId);
    updateURL(sessionId);
    setRawMessages([]);
    setBranchSelections({});
    if (window.innerWidth < 768) setSidebarOpen(false);
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/messages`, { headers: { Authorization: `Bearer ${currentToken}`, Accept: 'application/json' }, cache: 'no-store' });
      if (res.ok) setRawMessages(await res.json());
    } catch (error) { console.error('Failed to load messages'); }
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setRawMessages([]);
    setBranchSelections({});
    updateURL(null);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const deleteChat = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;
    try {
      const res = await fetch(`${API}/sessions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setSessions(sessions.filter((s) => s.id !== id));
        if (activeSessionId === id) startNewChat();
      }
    } catch (error) { console.error('Failed to delete chat'); }
  };

  const renameChat = async (id: number, e: React.MouseEvent | React.KeyboardEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (!editTitle.trim()) return setEditingSessionId(null);
    try {
      const res = await fetch(`${API}/sessions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: editTitle }) });
      if (res.ok) {
        setSessions(sessions.map((s) => (s.id === id ? { ...s, title: editTitle } : s)));
        setEditingSessionId(null);
      }
    } catch (error) { console.error('Failed to rename chat'); }
  };

  // Upgraded Send Message (Handles editing versions and branching)
  const sendMessage = async (overrideText?: string, specificParentId?: number | null) => {
    const userMessage = (overrideText ?? input).trim();
    if (!userMessage || !token || limits.remaining <= 0 || isLoading) return;

    // Determine parent_id for the branch
    const lastMsg = currentThread.length > 0 ? currentThread[currentThread.length - 1] : null;
    const parentId = specificParentId !== undefined ? specificParentId : (lastMsg ? lastMsg.id : null);

    setInput('');
    setEditingMsgId(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    // Optimistic UI Update
    const tempId = Date.now();
    const newUserMsg = { id: tempId, sender: 'user', text: userMessage, parent_id: parentId };
    setRawMessages(prev => [...prev, newUserMsg]);
    setBranchSelections(prev => ({ ...prev, [parentId || 'root']: tempId }));

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMessage, session_id: activeSessionId, parent_id: parentId }),
      });

      const data = await res.json();
      if (res.ok) {
        // Replace temp data with DB IDs
        setRawMessages(prev => [
          ...prev.filter(m => m.id !== tempId),
          { id: data.user_message_id, sender: 'user', text: userMessage, parent_id: parentId },
          { id: data.ai_message_id, sender: 'ai', text: data.ai_response || 'No response.', parent_id: data.user_message_id }
        ]);
        setBranchSelections(prev => ({ ...prev, [parentId || 'root']: data.user_message_id }));
        
        fetchLimit(token);
        fetchSessions(token);
        
        if (!activeSessionId && data.session_id) {
          setActiveSessionId(data.session_id);
          updateURL(data.session_id);
        }
      }
    } catch (error) { console.error("Message error"); } 
    finally { setIsLoading(false); }
  };

  const groupedSessions = () => {
    const groups: { label: string, data: typeof sessions }[] = [
      { label: 'Today', data: [] }, { label: 'Previous 7 Days', data: [] }, { label: 'Previous 30 Days', data: [] }, { label: 'Older', data: [] },
    ];
    const now = new Date();
    sessions.forEach(session => {
      const diffDays = Math.ceil(Math.abs(now.getTime() - new Date(session.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) groups[0].data.push(session);
      else if (diffDays <= 7) groups[1].data.push(session);
      else if (diffDays <= 30) groups[2].data.push(session);
      else groups[3].data.push(session);
    });
    return groups.filter(g => g.data.length > 0);
  };

  const logout = () => {
    localStorage.clear();
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    window.location.href = '/login';
  };

  // Instant Loading State (Wait for user object but skip waiting for APIs)
  if (!user) return <div className="h-screen w-screen bg-white flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>;

  const usedPct = Math.min(100, Math.round((limits.used / Math.max(limits.limit, 1)) * 100));
  const lowLimit = limits.remaining <= 3;
  const limitReached = limits.remaining <= 0;

  const UserAvatar = ({ size = 'w-8 h-8' }: { size?: string }) =>
    user.profile_image ? (
      <img src={user.profile_image} alt="User" className={`${size} rounded-full object-cover`} />
    ) : (
      <div className={`${size} rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-semibold`}>
        {user.name.charAt(0).toUpperCase()}
      </div>
    );

  return (
    <div data-theme={theme} className="nx-root flex h-screen overflow-hidden font-sans">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed md:relative z-40 h-full flex flex-col bg-[var(--sidebar)] border-r border-[var(--border)] transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-[272px] translate-x-0' : 'w-[272px] -translate-x-full md:translate-x-0 md:w-0 md:border-r-0'}`}>
        <div className="w-[272px] h-full flex flex-col">
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <div className="flex items-center gap-2 px-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
              <span className="font-semibold text-[15px] text-[var(--text)]">Nexus AI</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"><PanelLeftClose className="w-[18px] h-[18px]" /></button>
          </div>

          <div className="px-3 py-2">
            <button onClick={startNewChat} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] border border-[var(--border)] transition-colors"><SquarePen className="w-4 h-4" /> New chat</button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-2 custom-scrollbar">
            {groupedSessions().map((group, gIndex) => (
              <div key={gIndex} className="mb-2">
                <p className="text-[11px] font-bold text-[var(--muted)] px-3 pt-3 pb-2 uppercase tracking-wider">{group.label}</p>
                <div className="space-y-0.5">
                  {group.data.map((session) => {
                    const active = activeSessionId === session.id;
                    return (
                      <div key={session.id} onClick={() => { if (editingSessionId !== session.id) loadSessionMessages(session.id); }} className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${active ? 'bg-[var(--active)] text-[var(--text)]' : 'text-[var(--text)] hover:bg-[var(--hover)]'}`}>
                        {editingSessionId === session.id ? (
                          <input type="text" autoFocus className="flex-1 min-w-0 bg-[var(--bg)] text-[var(--text)] border border-indigo-400 rounded-md px-2 py-0.5 text-sm outline-none" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={(e) => renameChat(session.id, e)} onKeyDown={(e) => e.key === 'Enter' && renameChat(session.id, e)} onClick={(e) => e.stopPropagation()} />
                        ) : (
                          <>
                            <span className="text-sm truncate flex-1">{session.title}</span>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); setEditTitle(session.title); setEditingSessionId(session.id); }} className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={(e) => deleteChat(session.id, e)} className="p-1 rounded-md text-[var(--muted)] hover:text-rose-500 hover:bg-[var(--bg)]"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[var(--border)] space-y-3">
            <div className="px-1">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[var(--muted)]">Daily prompts</span>
                <span className={lowLimit ? 'text-rose-500 font-medium' : 'text-[var(--muted)]'}>{limits.remaining} left</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--active)] overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${lowLimit ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${usedPct}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2 px-1">
              <UserAvatar />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)] truncate">{user.name}</p>
                <p className="text-xs text-[var(--muted)]">Nexus Pro</p>
              </div>
              <button onClick={toggleTheme} className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors md:hidden"> {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />} </button>
              <button onClick={logout} className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-rose-500 transition-colors"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[var(--bg)] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
          <div className="nx-blob nx-b1" /><div className="nx-blob nx-b2" /><div className="nx-blob nx-b3" /><div className="nx-blob nx-b4" /><div className="nx-blob nx-b5" />
        </div>

        <header className="relative z-10 h-14 flex items-center justify-between px-3 sm:px-4 shrink-0">
          <div className="flex items-center gap-1">
            {!sidebarOpen && (
              <>
                <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"><Menu className="w-5 h-5 md:hidden" /><PanelLeftOpen className="w-5 h-5 hidden md:block" /></button>
                <button onClick={startNewChat} className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"><SquarePen className="w-5 h-5" /></button>
              </>
            )}
            <div className="flex items-center gap-2 px-2">
              <span className="font-semibold text-[var(--text)]">Nexus AI</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]">Flash</span>
            </div>
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors md:hidden"> {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />} </button>
        </header>

        <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-6">
            {currentThread.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[calc(100vh-280px)] text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6"><Sparkles className="w-7 h-7 text-white" /></div>
                <h2 className="nx-gradient-text text-[32px] sm:text-5xl font-semibold tracking-tight pb-1">Hello, {user.name.split(' ')[0]}</h2>
                <p className="text-[var(--muted)] mt-2 text-base sm:text-lg">How can I help you today?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10 w-full max-w-2xl">
                  {SUGGESTIONS.map((s) => (
                    <button key={s.title} onClick={() => sendMessage(s.text)} disabled={limitReached} className="text-left p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--hover)] transition-colors group disabled:opacity-50">
                      <s.icon className="w-5 h-5 text-indigo-500 mb-2.5" />
                      <p className="text-sm font-medium text-[var(--text)]">{s.title}</p>
                      <p className="text-[13px] text-[var(--muted)] mt-0.5 line-clamp-2">{s.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pt-4 space-y-8">
                {currentThread.map((msg) => {
                  // Setup < 1 / 2 > controls
                  const siblings = rawMessages.filter(m => m.parent_id === msg.parent_id).sort((a,b) => a.id - b.id);
                  const currentIndex = siblings.findIndex(m => m.id === msg.id);
                  const hasSiblings = siblings.length > 1;

                  return msg.sender === 'user' ? (
                    <div key={msg.id} className="flex flex-col items-end nx-fade group">
                      {editingMsgId === msg.id ? (
                        <div className="w-full bg-[var(--surface)] p-4 rounded-3xl mb-2">
                           <textarea autoFocus value={editMsgText} onChange={(e) => setEditMsgText(e.target.value)} className="w-full bg-transparent text-[var(--text)] resize-none outline-none custom-scrollbar" rows={3} />
                           <div className="flex justify-end gap-2 mt-2">
                             <button onClick={() => setEditingMsgId(null)} className="px-3 py-1.5 rounded-lg text-sm text-[var(--muted)] hover:bg-[var(--hover)]">Cancel</button>
                             <button onClick={() => sendMessage(editMsgText, msg.parent_id)} className="px-3 py-1.5 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 font-medium">Send</button>
                           </div>
                        </div>
                      ) : (
                        <div className="relative max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-3xl bg-[var(--surface)] text-[var(--text)] text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                          <button onClick={() => { setEditMsgText(msg.text); setEditingMsgId(msg.id); }} className="absolute -left-10 top-2 p-1.5 text-[var(--muted)] hover:text-indigo-500 hover:bg-[var(--surface)] rounded-full opacity-0 group-hover:opacity-100 transition-all"><Pencil className="w-4 h-4" /></button>
                        </div>
                      )}
                      
                      {/* < 1 / 2 > Paginator */}
                      {hasSiblings && (
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-[var(--muted)] font-medium">
                          <button onClick={() => setBranchSelections(prev => ({...prev, [msg.parent_id || 'root']: siblings[currentIndex - 1].id}))} disabled={currentIndex === 0} className="p-1 hover:text-[var(--text)] disabled:opacity-30 transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
                          <span>{currentIndex + 1} <span className="opacity-50">/</span> {siblings.length}</span>
                          <button onClick={() => setBranchSelections(prev => ({...prev, [msg.parent_id || 'root']: siblings[currentIndex + 1].id}))} disabled={currentIndex === siblings.length - 1} className="p-1 hover:text-[var(--text)] disabled:opacity-30 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={msg.id} className="flex gap-3 sm:gap-4 nx-fade">
                      <div className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="md-content text-[15px] text-[var(--text)]">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                              code({ node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} /> : <code {...props} className="inline-code">{children}</code>;
                              },
                              a({ node, children, ...props }: any) { return <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>; },
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                        <div className="mt-2 -ml-1.5"><CopyButton text={msg.text} /></div>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex gap-3 sm:gap-4 nx-fade">
                    <div className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center"><Sparkles className="w-4 h-4 text-white animate-pulse" /></div>
                    <div className="flex items-center gap-1.5 h-8"><span className="nx-dot" /><span className="nx-dot" style={{ animationDelay: '150ms' }} /><span className="nx-dot" style={{ animationDelay: '300ms' }} /></div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="relative z-10 shrink-0 px-4 sm:px-6 pb-4 pt-2">
          <div className="max-w-3xl mx-auto">
            {lowLimit && !limitReached && <p className="text-center text-xs text-rose-500 mb-2">Only {limits.remaining} prompt{limits.remaining === 1 ? '' : 's'} left today</p>}
            <div className={`nx-glow relative ${isLoading ? 'nx-glow-on' : ''}`}>
            <div className="nx-glow-bg" />
            <div className="relative flex items-end gap-2 bg-[var(--surface)] rounded-[28px] px-3 py-2 border border-transparent focus-within:border-[var(--border)] transition-colors">
              <textarea
                ref={textareaRef}
                className="flex-1 max-h-48 py-2.5 px-2 bg-transparent text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none resize-none overflow-y-auto text-[15px] leading-6 custom-scrollbar"
                placeholder={limitReached ? 'Daily limit reached. See you tomorrow!' : 'Message Nexus AI'}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 192)}px`;
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                disabled={limitReached}
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim() || limitReached}
                className="mb-1 w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-[var(--text)] text-[var(--bg)] disabled:opacity-25 hover:opacity-80 transition-opacity active:scale-95"
                title="Send"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-[18px] h-[18px]" strokeWidth={2.5} />}
              </button>
            </div>
            </div>
            <p className="text-center text-[var(--muted)] text-xs mt-2.5">Nexus AI can make mistakes. Please double-check important info.</p>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .nx-root[data-theme='light'] {
          --bg: #ffffff;
          --sidebar: #f9f9f9;
          --surface: #f4f4f5;
          --hover: #ececee;
          --active: #e4e4e7;
          --border: #e4e4e7;
          --text: #18181b;
          --muted: #71717a;
          --inline-bg: #f1f1f3;
        }
        .nx-root[data-theme='dark'] {
          --bg: #212121;
          --sidebar: #171717;
          --surface: #2f2f2f;
          --hover: #2a2a2a;
          --active: #343434;
          --border: #3a3a3a;
          --text: #ececec;
          --muted: #a1a1aa;
          --inline-bg: #343434;
        }
        .nx-root { background: var(--bg); color: var(--text); }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--muted); }

        .nx-fade { animation: nxFade 0.35s ease both; }
        @keyframes nxFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .nx-dot {
          width: 7px; height: 7px; border-radius: 9999px;
          background: var(--muted);
          animation: nxBounce 1.1s infinite ease-in-out;
        }
        @keyframes nxBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }

        .nx-blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(90px);
          opacity: 0.4;
          will-change: transform;
        }
        .nx-root[data-theme='dark'] .nx-blob { opacity: 0.22; }
        .nx-b1 { width: 520px; height: 520px; top: -18%; left: -10%; background: #4285f4; animation: nxFloat1 20s ease-in-out infinite; }
        .nx-b2 { width: 480px; height: 480px; top: -10%; right: -8%; background: #9b72f2; animation: nxFloat2 24s ease-in-out infinite; }
        .nx-b3 { width: 520px; height: 520px; bottom: -22%; left: 22%; background: #ff6ac1; animation: nxFloat3 22s ease-in-out infinite; }
        .nx-b4 { width: 420px; height: 420px; bottom: -12%; right: -6%; background: #ffb347; animation: nxFloat1 26s ease-in-out infinite reverse; }
        .nx-b5 { width: 380px; height: 380px; top: 35%; left: 8%; background: #34d3c0; animation: nxFloat2 28s ease-in-out infinite reverse; }
        @keyframes nxFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(80px, 60px) scale(1.15); }
          66% { transform: translate(-40px, 90px) scale(0.92); }
        }
        @keyframes nxFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-90px, 50px) scale(1.1); }
          66% { transform: translate(50px, -40px) scale(0.95); }
        }
        @keyframes nxFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(110px, -70px) scale(1.2); }
        }

        .nx-gradient-text {
          background: linear-gradient(90deg, #4285f4, #9b72f2, #d96570, #f9ab00, #4285f4);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: nxTextSlide 6s linear infinite;
        }
        @keyframes nxTextSlide { to { background-position: 200% center; } }

        .nx-glow-bg {
          position: absolute;
          inset: -2px;
          border-radius: 30px;
          background: linear-gradient(90deg, #4285f4, #9b72f2, #d96570, #f9ab00, #34a853, #4285f4);
          background-size: 300% 100%;
          filter: blur(10px);
          opacity: 0;
          transition: opacity 0.4s ease;
          animation: nxGlowSlide 4s linear infinite;
          pointer-events: none;
        }
        .nx-glow:focus-within .nx-glow-bg,
        .nx-glow-on .nx-glow-bg { opacity: 0.55; }
        @keyframes nxGlowSlide { to { background-position: 300% 0; } }

        @media (prefers-reduced-motion: reduce) {
          .nx-blob, .nx-gradient-text, .nx-glow-bg { animation: none; }
        }

        .md-content { line-height: 1.75; word-break: break-word; }
        .md-content > *:first-child { margin-top: 0; }
        .md-content p { margin: 0.75em 0; }
        .md-content h1, .md-content h2, .md-content h3, .md-content h4 { font-weight: 600; margin: 1.4em 0 0.5em; line-height: 1.3; }
        .md-content h1 { font-size: 1.5em; }
        .md-content h2 { font-size: 1.3em; }
        .md-content h3 { font-size: 1.1em; }
        .md-content ul { list-style: disc; padding-left: 1.5em; margin: 0.75em 0; }
        .md-content ol { list-style: decimal; padding-left: 1.5em; margin: 0.75em 0; }
        .md-content li { margin: 0.3em 0; }
        .md-content li::marker { color: var(--muted); }
        .md-content strong { font-weight: 600; }
        .md-content a { color: #6366f1; text-decoration: underline; text-underline-offset: 3px; }
        .md-content blockquote { border-left: 3px solid var(--border); padding-left: 1em; color: var(--muted); margin: 1em 0; }
        .md-content hr { border: 0; border-top: 1px solid var(--border); margin: 1.5em 0; }
        .md-content .inline-code { background: var(--inline-bg); padding: 0.15em 0.4em; border-radius: 6px; font-size: 0.88em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .md-content table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.92em; display: block; overflow-x: auto; }
        .md-content th, .md-content td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
        .md-content th { background: var(--surface); font-weight: 600; }
      `}</style>
    </div>
  );
}