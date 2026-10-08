'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Menu, Plus, MessageSquare, Copy, Check, PanelLeftClose } from 'lucide-react';
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

// Custom Copy Code Button Component
const CodeBlock = ({ language, value }: { language: string, value: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden ring-1 ring-slate-700/50 shadow-lg bg-[#1E1E2E]">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{language}</span>
        <button 
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="overflow-x-auto max-w-full">
        <SyntaxHighlighter
          style={atomOneDark}
          language={language}
          PreTag="div"
          className="!m-0 !p-4 text-sm font-mono"
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default function Chatbot() {
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dummy history sessions (Inko baad mein Laravel se fetch karenge)
  const [sessions, setSessions] = useState([
    { id: 1, title: 'PHP Array Mapping' },
    { id: 2, title: 'Laravel Authentication' },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://chatbot-backend.test/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // TODO: Yahan dynamic user_id aur session_id jayegi
        body: JSON.stringify({ user_id: 1, message: userMessage }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, { sender: 'ai', text: data.ai_response || "No response." }]);
      } else {
        setMessages((prev) => [...prev, { sender: 'ai', text: 'Oops! Connection error.' }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { sender: 'ai', text: 'Server is currently offline.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`bg-slate-50 border-r border-slate-200 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 hidden md:flex md:w-20'} relative z-20`}>
        <div className="p-4">
          <button 
            onClick={() => setMessages([])} 
            className={`flex items-center gap-2 w-full p-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl transition-all shadow-sm ${!sidebarOpen && 'md:justify-center md:p-3'}`}
          >
            <Plus className="w-5 h-5 text-indigo-600" />
            {sidebarOpen && <span className="font-semibold text-sm">New Chat</span>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-200">
          {sidebarOpen && <p className="text-xs font-semibold text-slate-400 px-3 py-2 uppercase tracking-wider">Recent</p>}
          {sessions.map((session) => (
            <button key={session.id} className="flex items-center gap-3 w-full p-3 text-left text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors">
              <MessageSquare className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="text-sm truncate">{session.title}</span>}
            </button>
          ))}
        </div>

        {/* User Auth Section */}
        <div className="p-4 border-t border-slate-200">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'md:justify-center'}`}>
            <img 
              src="https://ui-avatars.com/api/?name=Muhammad+Salman&background=6366f1&color=fff" 
              alt="User" 
              className="w-10 h-10 rounded-full shadow-sm ring-2 ring-white"
            />
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-800 truncate">Muhammad Salman</p>
                <p className="text-xs text-slate-500 truncate">Pro Plan</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden">
              <Menu className="w-5 h-5" />
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg hidden md:block">
              <PanelLeftClose className={`w-5 h-5 transition-transform ${!sidebarOpen && 'rotate-180'}`} />
            </button>
            <h1 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              Nexus <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">1.5 Flash</span>
            </h1>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <Bot className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">How can I help you today?</h2>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Avatar */}
                <div className="shrink-0 mt-1">
                  {msg.sender === 'user' ? (
                     <img src="https://ui-avatars.com/api/?name=Muhammad+Salman&background=6366f1&color=fff" className="w-8 h-8 rounded-full" alt="User" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center border border-emerald-600 shadow-sm">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Message Content with max-w-full to prevent horizontal scroll */}
                <div className="flex-1 min-w-0 max-w-full pt-1.5">
                  <div className="prose prose-slate prose-p:leading-relaxed max-w-none break-words text-[15px]">
                    {msg.sender === 'user' ? (
                      <p className="text-slate-800">{msg.text}</p>
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({node, inline, className, children, ...props}: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                              <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                            ) : (
                              <code {...props} className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded-md text-sm font-mono">
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
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                </div>
                <div className="flex items-center pt-2">
                   <div className="flex gap-1">
                     <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span>
                     <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                     <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                   </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Field */}
        <div className="p-4 bg-gradient-to-t from-white via-white to-transparent">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-slate-100 p-2 rounded-3xl shadow-sm border border-slate-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition-colors">
              <textarea
                className="flex-1 max-h-48 p-2.5 ml-2 bg-transparent text-slate-800 placeholder-slate-500 focus:outline-none resize-none overflow-y-auto text-[15px]"
                placeholder="Message Nexus..."
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
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="p-2.5 mb-0.5 mr-0.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all shrink-0"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
            <p className="text-center text-slate-400 text-xs mt-3 pb-1">AI can make mistakes. Check important info.</p>
          </div>
        </div>
        
      </main>
    </div>
  );
}