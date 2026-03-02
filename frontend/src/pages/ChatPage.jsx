import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { agentAPI } from '../api/client';
import { FiSend, FiUser, FiCpu } from 'react-icons/fi';

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
                content: '❌ Lỗi: ' + (err.response?.data?.detail || 'Không thể kết nối server'),
                error: true
            }]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const formatContent = (text) => {
        if (!text) return '';
        // Basic markdown-like formatting
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br/>');
    };

    return (
        <div className="chat-page">
            <div className="chat-container">
                <div className="chat-header">
                    <h2>💬 Chat AI — Trợ lý truyện</h2>
                    <p>Hỏi về nội dung, tác giả, thể loại, hoặc gợi ý truyện hay!</p>
                </div>

                <div className="chat-messages">
                    {messages.length === 0 && (
                        <div className="chat-empty">
                            <div className="chat-empty-icon">📖</div>
                            <h3>Xin chào, {user?.username}!</h3>
                            <p>Tôi là trợ lý AI chuyên về tiểu thuyết. Bạn có thể hỏi tôi:</p>
                            <div className="suggestions">
                                <button onClick={() => setInput('Có những thể loại truyện nào?')}>
                                    📚 Thể loại truyện
                                </button>
                                <button onClick={() => setInput('Gợi ý truyện hay')}>
                                    ✨ Gợi ý truyện
                                </button>
                                <button onClick={() => setInput('Truyện tiên hiệp nào hay?')}>
                                    🗡️ Truyện tiên hiệp
                                </button>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} className={`message ${msg.role} ${msg.error ? 'error' : ''}`}>
                            <div className="message-avatar">
                                {msg.role === 'user' ? <FiUser /> : <FiCpu />}
                            </div>
                            <div className="message-body">
                                <div
                                    className="message-content"
                                    dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                                />
                                {msg.sources?.length > 0 && (
                                    <div className="message-sources">
                                        <span>📎 Nguồn:</span>
                                        {msg.sources.map((s, j) => (
                                            <span key={j} className="source-tag">{s.title || s.story_title}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="message assistant">
                            <div className="message-avatar"><FiCpu /></div>
                            <div className="message-body">
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="chat-input-form">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Nhập câu hỏi..."
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading || !input.trim()} className="btn-send">
                        <FiSend />
                    </button>
                </form>
            </div>
        </div>
    );
}
