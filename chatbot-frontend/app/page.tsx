'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUp, Loader2, Menu, SquarePen, Copy, Check, PanelLeftClose, PanelLeftOpen,
  LogOut, Pencil, Trash2, Sparkles, Sun, Moon, Code2, Lightbulb, PenLine, Bug, ChevronLeft, ChevronRight,
  Paperclip, Download, X, FileText, Square, BrainCircuit
} from 'lucide-react';
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

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

const LOADING_STATES = ["Validating logic...", "Gathering context...", "Analyzing request...", "Viewing references...", "Generating response..."];

const CodeBlock = ({ language, value }: { language: string; value: string }) => {
  const [isCopied, setIsCopied] = useState(false);
  const copyToClipboard = () => { navigator.clipboard.writeText(value); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); };
  const downloadCode = () => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    let ext = 'txt';
    if(language === 'javascript' || language === 'js') ext = 'js'; else if(language === 'typescript' || language === 'ts') ext = 'ts';
    else if(language === 'python' || language === 'py') ext = 'py'; else if(language === 'php') ext = 'php';
    else if(language === 'html' || language === 'xml') ext = 'html'; else if(language === 'css') ext = 'css';
    else if(language === 'json') ext = 'json';
    a.download = `nexus_snippet.${ext}`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/10 bg-[#282c34]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1f232a] text-xs text-zinc-400">
        <span className="font-mono">{language}</span>
        <div className="flex gap-3">
          <button onClick={downloadCode} className="flex items-center gap-1.5 hover:text-white transition-colors"><Download className="w-3.5 h-3.5" /> Download</button>
          <button onClick={copyToClipboard} className="flex items-center gap-1.5 hover:text-white transition-colors">{isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{isCopied ? 'Copied' : 'Copy'}</button>
        </div>
      </div>
      <div className="overflow-x-auto max-w-full custom-scrollbar"><SyntaxHighlighter style={atomOneDark} language={language} PreTag="div" customStyle={{ margin: 0, padding: '16px', background: 'transparent', fontSize: '13.5px', lineHeight: 1.65 }}>{value}</SyntaxHighlighter></div>
    </div>
  );
};

const CopyButton = ({ text }: { text: string }) => {
  const [done, setDone] = useState(false);
  return <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); }} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors" title="Copy">{done ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>;
};

export default function Chatbot() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  const [rawMessages, setRawMessages] = useState<any[]>([]);
  const [branchSelections, setBranchSelections] = useState<Record<string, number>>({});
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CHANGED: IDs to string for UUID
  const [sessions, setSessions] = useState<{ id: string; title: string, updated_at: string }[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editMsgText, setEditMsgText] = useState('');

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [limits, setLimits] = useState({ total_used: 0, total_limit: 100, total_remaining: 100, file_used: 0, file_limit: 5, file_remaining: 5 });

  const [memoryText, setMemoryText] = useState('');
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    let interval: any;
    if (isLoading) { setLoadingTextIndex(0); interval = setInterval(() => { setLoadingTextIndex(prev => (prev + 1) % LOADING_STATES.length); }, 2000); }
    return () => clearInterval(interval);
  }, [isLoading]);

  const processedMessages = useMemo(() => {
    const sorted = [...rawMessages].sort((a, b) => Number(a.id) - Number(b.id));
    const firstModernMsgIndex = sorted.findIndex(msg => msg.parent_id != null);
    
    const linked = sorted.map((m, index) => {
        if (m.parent_id == null && index > 0) {
            if (firstModernMsgIndex === -1 || index < firstModernMsgIndex) return { ...m, parent_id: sorted[index - 1].id };
        }
        return m;
    });

    return linked.filter(m => {
        if (m.sender === 'ai') return true;
        const hasChild = linked.some(child => child.parent_id === m.id);
        const isTemp = m.id > 1000000000000; 
        return hasChild || isTemp; 
    });
  }, [rawMessages]);

  const currentThread = useMemo(() => {
    const thread = [];
    const roots = processedMessages.filter(m => !m.parent_id);
    if (roots.length === 0) return thread;

    let current = branchSelections['root'] ? processedMessages.find(m => m.id === branchSelections['root']) : roots[roots.length - 1];

    while (current) {
        thread.push(current);
        const children = processedMessages.filter(m => m.parent_id === current.id).sort((a, b) => Number(a.id) - Number(b.id));
        if (children.length === 0) break;
        current = branchSelections[current.id] ? processedMessages.find(m => m.id === branchSelections[current.id]) : children[children.length - 1];
    }
    return thread;
  }, [processedMessages, branchSelections]);

  const lastUserMsgId = currentThread.slice().reverse().find(m => m.sender === 'user')?.id;

  // UPDATED URL HELPER: uses /c/uuid pattern
  const updateURL = (chatId: string | null) => {
    if (chatId) window.history.pushState(null, '', `/c/${chatId}`);
    else window.history.pushState(null, '', `/`);
  };

  useEffect(() => {
    const initializeApp = async () => {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');
      if (!storedToken || !storedUser) { window.location.href = '/login'; return; }
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      setMemoryText(localStorage.getItem('nexus_memory') || '');

      fetchLimit(storedToken);
      fetchSessions(storedToken);

      // UPDATED PATH PARSING
      const path = window.location.pathname;
      if (path.startsWith('/c/')) {
        const chatIdHash = path.split('/c/')[1];
        if (chatIdHash) loadSessionMessages(chatIdHash, storedToken);
      }
    };
    
    initializeApp();
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) setTheme(savedTheme);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    if (window.innerWidth < 768) setSidebarOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { scrollToBottom(); }, [currentThread, isLoading, selectedFile]);

  const toggleTheme = () => { const next = theme === 'light' ? 'dark' : 'light'; setTheme(next); localStorage.setItem('theme', next); };
  const saveMemory = () => { localStorage.setItem('nexus_memory', memoryText); setShowMemoryModal(false); };

  const fetchLimit = async (authToken: string) => {
    try { const res = await fetch(`${API}/limit`, { headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' }, cache: 'no-store' }); if (res.ok) setLimits(await res.json()); } catch (error) {}
  };
  const fetchSessions = async (authToken: string) => {
    try { const res = await fetch(`${API}/sessions`, { headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' }, cache: 'no-store' }); if (res.ok) setSessions(await res.json()); } catch (error) {}
  };

  const loadSessionMessages = async (sessionId: string, currentToken: string | null = token) => {
    if (!currentToken) return;
    setActiveSessionId(sessionId); updateURL(sessionId); setRawMessages([]); setBranchSelections({}); if (window.innerWidth < 768) setSidebarOpen(false);
    try { const res = await fetch(`${API}/sessions/${sessionId}/messages`, { headers: { Authorization: `Bearer ${currentToken}`, Accept: 'application/json' }, cache: 'no-store' }); if (res.ok) setRawMessages(await res.json()); } catch (error) {}
  };

  const startNewChat = () => { setActiveSessionId(null); setRawMessages([]); setBranchSelections({}); setSelectedFile(null); updateURL(null); if (window.innerWidth < 768) setSidebarOpen(false); };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); if (!confirm('Are you sure you want to delete this chat?')) return;
    try { const res = await fetch(`${API}/sessions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { setSessions(sessions.filter((s) => s.id !== id)); if (activeSessionId === id) startNewChat(); } } catch (error) {}
  };

  const renameChat = async (id: string, e: React.MouseEvent | React.KeyboardEvent | React.FocusEvent) => {
    e.stopPropagation(); if (!editTitle.trim()) return setEditingSessionId(null);
    try { const res = await fetch(`${API}/sessions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: editTitle }) }); if (res.ok) { setSessions(sessions.map((s) => (s.id === id ? { ...s, title: editTitle } : s))); setEditingSessionId(null); } } catch (error) {}
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]; if (file.size > 10 * 1024 * 1024) { alert("File size exceeds 10MB limit"); return; } setSelectedFile(file);
    }
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setIsLoading(false); setAbortController(null);
      setRawMessages(prev => prev.filter(m => m.id < 1000000000000));
    }
  };

  const sendMessage = async (overrideText?: string, specificParentId?: number | null) => {
    const userMessage = (overrideText ?? input).trim();
    if (selectedFile && limits.file_remaining <= 0) return;
    if (limits.total_remaining <= 0) return;
    if ((!userMessage && !selectedFile) || !token || isLoading) return;

    const lastMsg = currentThread.length > 0 ? currentThread[currentThread.length - 1] : null;
    const parentId = specificParentId !== undefined ? specificParentId : (lastMsg ? lastMsg.id : null);

    setInput(''); setEditingMsgId(null); if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    const tempId = Date.now();
    const uiText = selectedFile ? `${userMessage}\n\n[Uploading: ${selectedFile.name}...]` : userMessage;
    const newUserMsg = { id: tempId, sender: 'user', text: uiText, parent_id: parentId };
    
    setRawMessages(prev => [...prev, newUserMsg]);
    setBranchSelections(prev => ({ ...prev, [parentId || 'root']: tempId }));

    const formData = new FormData();
    formData.append('message', userMessage || "Analyze this image.");
    if (activeSessionId) formData.append('session_id', activeSessionId);
    if (parentId) formData.append('parent_id', parentId.toString());
    if (selectedFile) formData.append('attachment', selectedFile);
    formData.append('memory', localStorage.getItem('nexus_memory') || '');

    const controller = new AbortController(); setAbortController(controller);

    try {
      const res = await fetch(`${API}/chat`, { method: 'POST', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: formData, signal: controller.signal });
      let data; try { data = await res.json(); } catch (err) { throw new Error("Server error or File too large."); }

      if (res.ok) {
        const freshSessionId = data.session_id || activeSessionId;
        if (freshSessionId) {
           const refreshRes = await fetch(`${API}/sessions/${freshSessionId}/messages`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, cache: 'no-store' });
           if(refreshRes.ok) { const allMsgs = await refreshRes.json(); setRawMessages(allMsgs); }
        }
        setBranchSelections(prev => ({ ...prev, [parentId || 'root']: data.user_message_id }));
        setSelectedFile(null); fetchLimit(token); fetchSessions(token);
        if (!activeSessionId && data.session_id) { setActiveSessionId(data.session_id); updateURL(data.session_id); }
      } else {
        setRawMessages(prev => prev.filter(m => m.id !== tempId));
        alert("Failed to send message: " + (data.message || data.ai_response || "Unknown server error"));
      }
    } catch (error: any) { 
      if (error.name !== 'AbortError') alert("Error: " + error.message);
      setRawMessages(prev => prev.filter(m => m.id !== tempId));
    } finally { 
      setIsLoading(false); setAbortController(null);
    }
  };

  const groupedSessions = () => {
    const groups: { label: string, data: typeof sessions }[] = [ { label: 'Today', data: [] }, { label: 'Previous 7 Days', data: [] }, { label: 'Previous 30 Days', data: [] }, { label: 'Older', data: [] } ];
    const now = new Date();
    sessions.forEach(session => {
      const diffDays = Math.ceil(Math.abs(now.getTime() - new Date(session.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) groups[0].data.push(session); else if (diffDays <= 7) groups[1].data.push(session); else if (diffDays <= 30) groups[2].data.push(session); else groups[3].data.push(session);
    });
    return groups.filter(g => g.data.length > 0);
  };

  const logout = () => { localStorage.clear(); document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'; window.location.href = '/login'; };
  if (!user) return <div className="h-screen w-screen bg-white flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>;

  const totalLimitReached = limits.total_remaining <= 0;
  const fileLimitReached = limits.file_remaining <= 0;
  const UserAvatar = ({ size = 'w-8 h-8' }: { size?: string }) => user.profile_image ? ( <img src={user.profile_image} alt="User" className={`${size} rounded-full object-cover`} /> ) : ( <div className={`${size} rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-semibold`}>{user.name.charAt(0).toUpperCase()}</div> );

  return (
    <div data-theme={theme} className="nx-root flex h-screen overflow-hidden font-sans">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}
      
      {showMemoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 nx-fade">
          <div className="bg-[var(--bg)] border border-[var(--border)] w-full max-w-lg rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-indigo-500"/> Custom Instructions</h3>
              <button onClick={() => setShowMemoryModal(false)} className="p-1 hover:bg-[var(--hover)] rounded-full text-[var(--muted)] transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <p className="text-sm text-[var(--muted)] mb-4">What would you like Nexus AI to know about you to provide better responses? (e.g., "I am a Laravel backend developer from Lahore. Give short answers.")</p>
            <textarea className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-[15px] text-[var(--text)] focus:outline-none focus:border-indigo-500 resize-none custom-scrollbar" rows={5} placeholder="Enter your instructions here..." value={memoryText} onChange={(e) => setMemoryText(e.target.value)} />
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowMemoryModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--surface)] text-[var(--text)] transition-colors">Cancel</button>
              <button onClick={saveMemory} className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">Save Memory</button>
            </div>
          </div>
        </div>
      )}

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

          <div className="p-4 border-t border-[var(--border)] space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[var(--muted)]">Daily Prompts</span>
                <span className={limits.total_remaining <= (limits.total_limit * 0.1) ? 'text-rose-500 font-medium' : 'text-[var(--muted)]'}>{limits.total_remaining} / {limits.total_limit}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--active)] overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${limits.total_remaining <= (limits.total_limit * 0.1) ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, (limits.total_used / Math.max(limits.total_limit, 1)) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-[var(--muted)] mt-1.5 text-center font-medium">Max {limits.file_limit} files per day ({limits.file_remaining} left)</p>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <UserAvatar />
              <div className="flex-1 min-w-0 pr-1">
                <p className="text-sm font-medium text-[var(--text)] truncate">{user.name}</p>
                <p className="text-xs text-[var(--muted)]">Nexus Pro</p>
              </div>
              <button onClick={() => setShowMemoryModal(true)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-indigo-500 transition-colors" title="Memory Settings"><BrainCircuit className="w-4 h-4" /></button>
              <button onClick={toggleTheme} className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors">{theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}</button>
              <button onClick={logout} className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-rose-500 transition-colors"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[var(--bg)] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden><div className="nx-blob nx-b1" /><div className="nx-blob nx-b2" /><div className="nx-blob nx-b3" /><div className="nx-blob nx-b4" /><div className="nx-blob nx-b5" /></div>

        <header className="relative z-10 h-14 flex items-center justify-between px-3 sm:px-4 shrink-0">
          <div className="flex items-center gap-1">
            {!sidebarOpen && (
              <>
                <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"><Menu className="w-5 h-5 md:hidden" /><PanelLeftOpen className="w-5 h-5 hidden md:block" /></button>
                <button onClick={startNewChat} className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"><SquarePen className="w-5 h-5" /></button>
              </>
            )}
            <div className="flex items-center gap-2 px-2"><span className="font-semibold text-[var(--text)]">Nexus AI</span><span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]">Flash</span></div>
          </div>
          <div className="flex items-center gap-1 md:hidden">
            <button onClick={() => setShowMemoryModal(true)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"><BrainCircuit className="w-5 h-5" /></button>
            <button onClick={toggleTheme} className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors">{theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}</button>
          </div>
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
                    <button key={s.title} onClick={() => sendMessage(s.text)} disabled={totalLimitReached} className="text-left p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--hover)] transition-colors group disabled:opacity-50">
                      <s.icon className="w-5 h-5 text-indigo-500 mb-2.5" /><p className="text-sm font-medium text-[var(--text)]">{s.title}</p><p className="text-[13px] text-[var(--muted)] mt-0.5 line-clamp-2">{s.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pt-4 space-y-8">
                {currentThread.map((msg) => {
                  const siblings = processedMessages.filter(m => m.parent_id === msg.parent_id).sort((a,b) => Number(a.id) - Number(b.id));
                  const currentIndex = siblings.findIndex(m => m.id === msg.id);
                  const hasSiblings = siblings.length > 1;
                  const isHighlighted = msg.id === lastUserMsgId;

                  return msg.sender === 'user' ? (
                    <div key={msg.id} className={`flex flex-col items-end nx-fade group ${isHighlighted ? 'nx-prompt-highlight' : ''}`}>
                      {editingMsgId === msg.id ? (
                        <div className="w-full bg-[var(--surface)] p-4 rounded-3xl mb-2">
                           <textarea autoFocus value={editMsgText} onChange={(e) => setEditMsgText(e.target.value)} className="w-full bg-transparent text-[var(--text)] resize-none outline-none custom-scrollbar" rows={4} />
                           <div className="flex justify-end gap-2 mt-2">
                             <button onClick={() => setEditingMsgId(null)} className="px-3 py-1.5 rounded-lg text-sm text-[var(--muted)] hover:bg-[var(--hover)] transition-colors">Cancel</button>
                             <button onClick={() => sendMessage(editMsgText, msg.parent_id)} className="px-3 py-1.5 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-colors">Send</button>
                           </div>
                        </div>
                      ) : (
                        <div className={`relative max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-3xl bg-[var(--surface)] text-[var(--text)] text-[15px] leading-relaxed whitespace-pre-wrap break-words transition-all duration-500 ${isHighlighted ? 'ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20' : ''}`}>
                          <div className="md-content">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img({ node, ...props }: any) { return <img {...props} className="max-w-[280px] sm:max-w-[400px] max-h-[350px] rounded-xl my-2 border-2 border-[var(--border)] shadow-md object-contain bg-[var(--surface)]" loading="lazy" alt="Attachment" />; } }}>
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                          <button onClick={() => { setEditMsgText(msg.text.replace(/\[Attached File: .*\]/, '').replace(/!\[.*?\]\(.*?\)/, '').trim()); setEditingMsgId(msg.id); }} className="absolute -left-10 top-2 p-1.5 text-[var(--muted)] hover:text-indigo-500 hover:bg-[var(--surface)] rounded-full opacity-0 group-hover:opacity-100 transition-all"><Pencil className="w-4 h-4" /></button>
                        </div>
                      )}
                      
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
                              code({ node, inline, className, children, ...props }: any) { const match = /language-(\w+)/.exec(className || ''); return !inline && match ? <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} /> : <code {...props} className="inline-code">{children}</code>; },
                              a({ node, children, ...props }: any) { return <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>; },
                              img({ node, ...props }: any) { return <img {...props} className="max-w-[280px] sm:max-w-[400px] max-h-[350px] rounded-xl my-2 border-2 border-[var(--border)] shadow-md object-contain bg-[var(--surface)]" loading="lazy" alt="Attachment" />; }
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
                    <div className="flex items-center gap-2 h-8">
                       <span className="text-[13px] font-semibold text-indigo-500 animate-pulse">{LOADING_STATES[loadingTextIndex]}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="relative z-10 shrink-0 px-4 sm:px-6 pb-4 pt-2">
          <div className="max-w-3xl mx-auto">
            {limits.total_remaining <= 10 && !totalLimitReached && <p className="text-center text-xs text-rose-500 mb-2">Only {limits.total_remaining} prompt{limits.total_remaining === 1 ? '' : 's'} left today</p>}
            {limits.file_remaining <= 1 && selectedFile && <p className="text-center text-xs text-rose-500 mb-2">Only {limits.file_remaining} file upload{limits.file_remaining === 1 ? '' : 's'} left today</p>}
            
            {selectedFile && (
              <div className="mb-3 inline-block">
                {selectedFile.type.startsWith('image/') ? (
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-[var(--border)] shadow-md">
                    <img src={URL.createObjectURL(selectedFile)} alt="preview" className="w-full h-full object-cover" />
                    <button onClick={() => setSelectedFile(null)} className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-rose-500 text-white p-1 rounded-full backdrop-blur-md transition-colors"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-full px-3 py-1.5 text-xs text-[var(--text)] shadow-sm">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="max-w-[200px] truncate font-medium">{selectedFile.name}</span>
                    <button onClick={() => setSelectedFile(null)} className="p-0.5 hover:bg-[var(--border)] rounded-full transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            )}

            <div className={`nx-glow relative ${isLoading ? 'nx-glow-on' : ''}`}>
            <div className="nx-glow-bg" />
            <div className="relative flex items-end gap-2 bg-[var(--surface)] rounded-[28px] px-3 py-2 border border-transparent focus-within:border-[var(--border)] transition-colors">
              
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.js,.ts,.php,.py,.html,.css,.jpg,.jpeg,.png,.gif,.webp" />
              <button onClick={() => fileInputRef.current?.click()} disabled={fileLimitReached || totalLimitReached || isLoading} className="mb-1.5 p-1.5 rounded-full text-[var(--muted)] hover:text-indigo-500 hover:bg-[var(--bg)] transition-colors disabled:opacity-50" title={`Attach file (Max ${limits.file_limit} files per day)`}>
                <Paperclip className="w-5 h-5" />
              </button>

              <textarea
                ref={textareaRef}
                className="flex-1 max-h-48 py-2.5 px-1 bg-transparent text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none resize-none overflow-y-auto text-[15px] leading-6 custom-scrollbar"
                placeholder={totalLimitReached ? 'Daily prompt limit reached.' : (selectedFile && fileLimitReached ? 'File limit reached for today.' : 'Message Nexus AI')}
                rows={1}
                value={input}
                onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 192)}px`; }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); isLoading ? stopGeneration() : sendMessage(); } }}
                disabled={totalLimitReached}
              />
              <button onClick={isLoading ? stopGeneration : () => sendMessage()} disabled={(!isLoading && !input.trim() && !selectedFile) || totalLimitReached} className="mb-1 w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-[var(--text)] text-[var(--bg)] disabled:opacity-25 hover:opacity-80 transition-opacity active:scale-95" title={isLoading ? "Stop generating" : "Send"}>
                {isLoading ? <Square className="w-3.5 h-3.5" fill="currentColor" /> : <ArrowUp className="w-[18px] h-[18px]" strokeWidth={2.5} />}
              </button>
            </div>
            </div>
            <p className="text-center text-[var(--muted)] text-xs mt-2.5">Nexus AI can make mistakes. Please double-check important info.</p>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .nx-root[data-theme='light'] { --bg: #ffffff; --sidebar: #f9f9f9; --surface: #f4f4f5; --hover: #ececee; --active: #e4e4e7; --border: #e4e4e7; --text: #18181b; --muted: #71717a; --inline-bg: #f1f1f3; }
        .nx-root[data-theme='dark'] { --bg: #212121; --sidebar: #171717; --surface: #2f2f2f; --hover: #2a2a2a; --active: #343434; --border: #3a3a3a; --text: #ececec; --muted: #a1a1aa; --inline-bg: #343434; }
        .nx-root { background: var(--bg); color: var(--text); }

        .md-content img { max-width: 100%; max-height: 350px; border-radius: 12px; margin: 0.5em 0; border: 2px solid var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.08); object-fit: contain; background: var(--surface); }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--muted); }

        .nx-fade { animation: nxFade 0.35s ease both; }
        @keyframes nxFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .nx-prompt-highlight { animation: promptGlow 2.5s ease-out; }
        @keyframes promptGlow { 0% { filter: drop-shadow(0 0 15px rgba(99,102,241, 0.4)); } 50% { filter: drop-shadow(0 0 8px rgba(99,102,241, 0.2)); } 100% { filter: drop-shadow(0 0 0px transparent); } }

        .nx-blob { position: absolute; border-radius: 9999px; filter: blur(90px); opacity: 0.4; will-change: transform; }
        .nx-root[data-theme='dark'] .nx-blob { opacity: 0.22; }
        .nx-b1 { width: 520px; height: 520px; top: -18%; left: -10%; background: #4285f4; animation: nxFloat1 20s ease-in-out infinite; }
        .nx-b2 { width: 480px; height: 480px; top: -10%; right: -8%; background: #9b72f2; animation: nxFloat2 24s ease-in-out infinite; }
        .nx-b3 { width: 520px; height: 520px; bottom: -22%; left: 22%; background: #ff6ac1; animation: nxFloat3 22s ease-in-out infinite; }
        .nx-b4 { width: 420px; height: 420px; bottom: -12%; right: -6%; background: #ffb347; animation: nxFloat1 26s ease-in-out infinite reverse; }
        .nx-b5 { width: 380px; height: 380px; top: 35%; left: 8%; background: #34d3c0; animation: nxFloat2 28s ease-in-out infinite reverse; }
        @keyframes nxFloat1 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(80px, 60px) scale(1.15); } 66% { transform: translate(-40px, 90px) scale(0.92); } }
        @keyframes nxFloat2 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-90px, 50px) scale(1.1); } 66% { transform: translate(50px, -40px) scale(0.95); } }
        @keyframes nxFloat3 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(110px, -70px) scale(1.2); } }

        .nx-gradient-text { background: linear-gradient(90deg, #4285f4, #9b72f2, #d96570, #f9ab00, #4285f4); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: nxTextSlide 6s linear infinite; }
        @keyframes nxTextSlide { to { background-position: 200% center; } }

        .nx-glow-bg { position: absolute; inset: -2px; border-radius: 30px; background: linear-gradient(90deg, #4285f4, #9b72f2, #d96570, #f9ab00, #34a853, #4285f4); background-size: 300% 100%; filter: blur(10px); opacity: 0; transition: opacity 0.4s ease; animation: nxGlowSlide 4s linear infinite; pointer-events: none; }
        .nx-glow:focus-within .nx-glow-bg, .nx-glow-on .nx-glow-bg { opacity: 0.55; }
        @keyframes nxGlowSlide { to { background-position: 300% 0; } }
        @media (prefers-reduced-motion: reduce) { .nx-blob, .nx-gradient-text, .nx-glow-bg { animation: none; } }

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