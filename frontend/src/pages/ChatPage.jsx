import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { agentAPI } from '../api/client';

export default function ChatPage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const sessionId = `user_${user?.id || 'default'}`;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

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

    const formatContent = (text) => {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 py-0.5 rounded text-sm">$1</code>')
            .replace(/\n/g, '<br/>');
    };

    const handleSuggestion = (text) => {
        setInput(text);
        inputRef.current?.focus();
    };

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <aside className="w-64 bg-black border-r border-gray-800 flex-col hidden md:flex">
                <div className="p-4">
                    <button className="w-full bg-gray-900 hover:bg-gray-800 text-white border border-gray-700 rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 transition-colors font-medium text-sm">
                        <span className="material-icons text-sm text-white">add</span>
                        New Chat
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2 mt-2">Chat History</div>
                    {messages.length > 0 && (
                        <a className="block px-3 py-2 rounded-lg bg-gray-900 text-sm font-medium mb-1 truncate text-white border border-gray-800" href="#">
                            Current Conversation
                        </a>
                    )}
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col h-full relative bg-black">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                    {messages.length === 0 ? (
                        /* Welcome State */
                        <div className="flex-1 flex items-center justify-center">
                            <div className="max-w-2xl w-full text-center space-y-8 mt-[-8vh]">
                                <div className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-700">
                                    <span className="material-icons text-4xl text-white">auto_awesome</span>
                                </div>
                                <div className="space-y-3">
                                    <h1 className="text-4xl font-bold tracking-tight text-white">
                                        Hello, {user?.username || 'there'}!
                                    </h1>
                                    <p className="text-gray-400 text-lg">How can I help with your stories today?</p>
                                </div>
                                <div className="flex flex-wrap justify-center gap-3 pt-6">
                                    <button
                                        onClick={() => handleSuggestion('Có những thể loại truyện nào?')}
                                        className="px-5 py-2.5 rounded-full border border-gray-500 bg-gray-900 hover:bg-gray-800 hover:border-gray-300 text-sm font-medium text-white flex items-center gap-2 transition-all"
                                    >
                                        <span className="material-icons text-[18px] text-white">category</span>
                                        Genre
                                    </button>
                                    <button
                                        onClick={() => handleSuggestion('Gợi ý truyện hay')}
                                        className="px-5 py-2.5 rounded-full border border-gray-500 bg-gray-900 hover:bg-gray-800 hover:border-gray-300 text-sm font-medium text-white flex items-center gap-2 transition-all"
                                    >
                                        <span className="material-icons text-[18px] text-white">lightbulb</span>
                                        Recommendations
                                    </button>
                                    <button
                                        onClick={() => handleSuggestion('Truyện tiên hiệp nào hay?')}
                                        className="px-5 py-2.5 rounded-full border border-gray-500 bg-gray-900 hover:bg-gray-800 hover:border-gray-300 text-sm font-medium text-white flex items-center gap-2 transition-all"
                                    >
                                        <span className="material-icons text-[18px] text-white">trending_up</span>
                                        New Trends
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Messages */
                        <div className="max-w-3xl w-full mx-auto space-y-4">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex gap-3 animate-fadeIn ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center">
                                            <span className="material-icons text-sm text-white">auto_awesome</span>
                                        </div>
                                    )}
                                    <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                                        <div
                                            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                                    ? 'bg-white text-black rounded-br-sm'
                                                    : msg.error
                                                        ? 'bg-red-500/10 border border-red-500/30 text-red-400 rounded-bl-sm'
                                                        : 'bg-gray-900 border border-gray-800 text-white rounded-bl-sm'
                                                }`}
                                            dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                                        />
                                        {msg.sources?.length > 0 && (
                                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                                                <span className="material-icons text-[14px]">attach_file</span>
                                                {msg.sources.map((s, j) => (
                                                    <span key={j} className="bg-gray-900 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-full text-[11px]">
                                                        {s.title || s.story_title}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center">
                                            <span className="material-icons text-sm text-black">person</span>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {loading && (
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center">
                                        <span className="material-icons text-sm text-white">auto_awesome</span>
                                    </div>
                                    <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-sm px-4 py-4">
                                        <div className="flex gap-1">
                                            <span className="typing-dot"></span>
                                            <span className="typing-dot"></span>
                                            <span className="typing-dot"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Bar */}
                <div className="p-4 sm:p-6 bg-gradient-to-t from-black via-black/95 to-transparent">
                    <form onSubmit={handleSend} className="max-w-3xl mx-auto relative group">
                        <div className="relative flex items-center bg-gray-900 border border-white rounded-2xl shadow-sm focus-within:ring-1 focus-within:ring-white focus-within:border-white transition-all">
                            <button type="button" className="p-3 text-white hover:text-gray-300 transition-colors ml-1">
                                <span className="material-icons text-[22px]">attach_file</span>
                            </button>
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Message Novel AI..."
                                disabled={loading}
                                className="flex-1 bg-transparent border-none px-2 py-4 focus:ring-0 text-white placeholder-gray-400"
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="m-2 w-10 h-10 bg-white hover:bg-gray-200 text-black rounded-xl flex items-center justify-center transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <span className="material-icons text-[20px] ml-0.5">send</span>
                            </button>
                        </div>
                    </form>
                    <p className="text-center text-xs text-gray-500 mt-4">Novel AI may produce inaccurate information about people, places, or facts.</p>
                </div>
            </main>
        </div>
    );
}
