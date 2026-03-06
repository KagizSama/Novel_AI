import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { agentAPI, chatHistoryAPI } from '../api/client';
import Markdown from 'react-markdown';

export default function ChatPage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages]);

    // Load sessions on mount
    const loadSessions = useCallback(async () => {
        try {
            setSessionsLoading(true);
            const res = await chatHistoryAPI.getSessions();
            setSessions(res.data);
        } catch (err) {
            console.error('Failed to load sessions:', err);
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    // Load messages when active session changes
    const loadMessages = useCallback(async (sessionId) => {
        if (!sessionId) return;
        try {
            const res = await chatHistoryAPI.getMessages(sessionId);
            setMessages(res.data.map(m => ({
                role: m.role,
                content: m.content,
                sources: m.sources,
            })));
        } catch (err) {
            console.error('Failed to load messages:', err);
            setMessages([]);
        }
    }, []);

    const handleSelectSession = (sessionId) => {
        setActiveSessionId(sessionId);
        loadMessages(sessionId);
    };

    const handleNewChat = async () => {
        try {
            const res = await chatHistoryAPI.createSession();
            const newSession = res.data;
            setSessions(prev => [newSession, ...prev]);
            setActiveSessionId(newSession.id);
            setMessages([]);
            inputRef.current?.focus();
        } catch (err) {
            console.error('Failed to create session:', err);
        }
    };

    const handleDeleteSession = async (e, sessionId) => {
        e.stopPropagation();
        try {
            await chatHistoryAPI.deleteSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (activeSessionId === sessionId) {
                setActiveSessionId(null);
                setMessages([]);
            }
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        // Auto-create session if none active
        let sessionId = activeSessionId;
        if (!sessionId) {
            try {
                const res = await chatHistoryAPI.createSession();
                const newSession = res.data;
                setSessions(prev => [newSession, ...prev]);
                setActiveSessionId(newSession.id);
                sessionId = newSession.id;
            } catch {
                return;
            }
        }

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const res = await agentAPI.chat(userMsg, sessionId);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.data.answer,
                sources: res.data.sources
            }]);

            // Update session title in sidebar (auto-title from first message)
            setSessions(prev => prev.map(s =>
                s.id === sessionId && s.title === 'New Chat'
                    ? { ...s, title: userMsg.slice(0, 80) + (userMsg.length > 80 ? '...' : ''), message_count: (s.message_count || 0) + 2 }
                    : s.id === sessionId
                        ? { ...s, message_count: (s.message_count || 0) + 2 }
                        : s
            ));
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Error: ' + (err.response?.data?.detail || 'Cannot connect to server'),
                error: true
            }]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const suggestions = [
        { icon: 'auto_stories', text: 'Tìm truyện tiên hiệp hay nhất' },
        { icon: 'search', text: 'Tóm tắt nội dung truyện' },
        { icon: 'library_books', text: 'Gợi ý truyện theo thể loại' },
    ];

    const handleSuggestion = (text) => {
        setInput(text);
        inputRef.current?.focus();
    };

    return (
        <div className="flex h-full bg-black text-white font-display">
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 flex-shrink-0 border-r border-white/10 bg-[#050505] flex flex-col overflow-hidden`}>
                {/* Sidebar Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                    <span className="text-sm font-semibold text-white/80 tracking-wide uppercase">Chat History</span>
                    <button
                        onClick={handleNewChat}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-black hover:bg-gray-200 transition-colors"
                        title="New Chat"
                    >
                        <span className="material-icons text-[18px]">add</span>
                    </button>
                </div>

                {/* Sessions List */}
                <div className="flex-1 overflow-y-auto">
                    {sessionsLoading ? (
                        <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                    ) : sessions.length === 0 ? (
                        <div className="p-6 text-center">
                            <span className="material-icons-outlined text-3xl text-gray-600 mb-2 block">forum</span>
                            <p className="text-gray-500 text-sm">No conversations yet</p>
                            <p className="text-gray-600 text-xs mt-1">Start a new chat to begin</p>
                        </div>
                    ) : (
                        <div className="py-2">
                            {sessions.map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => handleSelectSession(session.id)}
                                    className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${activeSessionId === session.id
                                        ? 'bg-white/10 border-r-2 border-white'
                                        : 'hover:bg-white/5'
                                        }`}
                                >
                                    <span className="material-icons-outlined text-[18px] text-gray-500 flex-shrink-0">chat_bubble_outline</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">{session.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {session.message_count || 0} messages
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteSession(e, session.id)}
                                        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all flex-shrink-0"
                                        title="Delete"
                                    >
                                        <span className="material-icons text-[16px]">delete_outline</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Chat Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <span className="material-icons text-[20px]">{sidebarOpen ? 'menu_open' : 'menu'}</span>
                    </button>
                    <div className="flex-1">
                        <h2 className="text-sm font-medium text-white truncate">
                            {activeSessionId
                                ? sessions.find(s => s.id === activeSessionId)?.title || 'Chat'
                                : 'New Conversation'}
                        </h2>
                    </div>
                    <button
                        onClick={handleNewChat}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors border border-white/10"
                    >
                        <span className="material-icons text-[14px]">add</span>
                        New Chat
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-6">
                    {messages.length === 0 && !loading ? (
                        /* Welcome State */
                        <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center animate-fade-in">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                <span className="material-icons text-3xl text-white/60">auto_awesome</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Novel AI</h2>
                            <p className="text-gray-400 text-sm mb-8">
                                Ask me about stories, search the library, or request a crawl.
                            </p>
                            <div className="grid grid-cols-1 gap-3 w-full">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSuggestion(s.text)}
                                        className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
                                    >
                                        <span className="material-icons text-gray-500 group-hover:text-white transition-colors">{s.icon}</span>
                                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{s.text}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Messages */
                        <div className="max-w-3xl mx-auto space-y-6">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                    <div className={`max-w-[85%] ${msg.role === 'user'
                                        ? 'bg-white text-black rounded-2xl rounded-br-md px-4 py-3'
                                        : 'bg-white/5 border border-white/10 text-white rounded-2xl rounded-bl-md px-4 py-3'
                                        }`}>
                                        {msg.role === 'user' ? (
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                        ) : (
                                            <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-white prose-a:text-blue-400">
                                                <Markdown>{msg.content}</Markdown>
                                            </div>
                                        )}
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-white/10">
                                                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                                                    <span className="material-icons text-[12px]">source</span>
                                                    Sources
                                                </p>
                                                {msg.sources.map((source, si) => (
                                                    <div key={si} className="text-xs text-gray-400 mb-1 pl-2 border-l border-white/10">
                                                        <span className="text-gray-300">{source.story_title}</span>
                                                        {' — '}{source.chapter_title}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start animate-fade-in">
                                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span>
                                            <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full" style={{ animationDelay: '0.15s' }}></span>
                                            <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full" style={{ animationDelay: '0.3s' }}></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Bar */}
                <div className="border-t border-white/10 p-4 flex-shrink-0">
                    <form onSubmit={handleSend} className="max-w-3xl mx-auto flex items-center gap-3">
                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your message..."
                                disabled={loading}
                                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 pr-12 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all disabled:opacity-50"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
                        >
                            <span className="material-icons text-[20px]">send</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
