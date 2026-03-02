import { useState, useEffect } from 'react';
import { agentAPI } from '../api/client';
import { FiBook, FiSearch, FiTag, FiStar, FiRefreshCw } from 'react-icons/fi';

export default function LibraryPage() {
    const [genres, setGenres] = useState([]);
    const [stories, setStories] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('genres'); // 'genres' | 'stories' | 'recommend'

    const askAgent = async (query) => {
        setLoading(true);
        try {
            const res = await agentAPI.chat(query, 'library_browse');
            return res.data.answer;
        } catch {
            return 'Lỗi kết nối server';
        } finally {
            setLoading(false);
        }
    };

    const loadGenres = async () => {
        setView('genres');
        const answer = await askAgent('Có những thể loại truyện nào?');
        setGenres([answer]);
    };

    const loadByGenre = async (genre) => {
        setSelectedGenre(genre);
        setView('stories');
        const answer = await askAgent(`Truyện thể loại ${genre}`);
        setStories([answer]);
    };

    const loadRecommend = async () => {
        setView('recommend');
        const answer = await askAgent('Gợi ý cho tôi vài truyện hay');
        setStories([answer]);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setView('stories');
        const answer = await askAgent(searchQuery);
        setStories([answer]);
    };

    useEffect(() => {
        loadGenres();
    }, []);

    const formatContent = (text) => {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br/>');
    };

    return (
        <div className="library-page">
            <div className="library-header">
                <h2><FiBook /> Thư viện truyện</h2>
                <div className="library-actions">
                    <button onClick={loadGenres} className={`btn btn-sm ${view === 'genres' ? 'btn-primary' : 'btn-ghost'}`}>
                        <FiTag /> Thể loại
                    </button>
                    <button onClick={loadRecommend} className={`btn btn-sm ${view === 'recommend' ? 'btn-primary' : 'btn-ghost'}`}>
                        <FiStar /> Gợi ý
                    </button>
                </div>
            </div>

            <form onSubmit={handleSearch} className="library-search">
                <div className="search-input-wrapper">
                    <FiSearch />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm truyện theo tên, tác giả, nội dung..."
                    />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    Tìm
                </button>
            </form>

            <div className="library-content">
                {loading ? (
                    <div className="loading-state">
                        <FiRefreshCw className="spin" />
                        <p>Đang tải...</p>
                    </div>
                ) : (
                    <div className="library-results">
                        {selectedGenre && view === 'stories' && (
                            <div className="breadcrumb">
                                <button onClick={loadGenres} className="btn-link">Thể loại</button>
                                <span> / </span>
                                <span>{selectedGenre}</span>
                            </div>
                        )}
                        {(view === 'genres' ? genres : stories).map((content, i) => (
                            <div key={i} className="result-card">
                                <div
                                    className="result-content"
                                    dangerouslySetInnerHTML={{ __html: formatContent(content) }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {view === 'genres' && !loading && (
                <div className="genre-quick-links">
                    <h3>Thể loại phổ biến</h3>
                    <div className="genre-tags">
                        {['Tiên Hiệp', 'Kiếm Hiệp', 'Huyền Huyễn', 'Đô Thị', 'Ngôn Tình', 'Xuyên Không'].map(g => (
                            <button key={g} onClick={() => loadByGenre(g)} className="genre-tag">
                                {g}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
