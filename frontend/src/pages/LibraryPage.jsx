import { useState, useEffect } from 'react';
import { libraryAPI } from '../api/client';

// Map genre names to Material Icons
const genreIcons = {
    'Tiên Hiệp': 'local_fire_department',
    'Kiếm Hiệp': 'sports_martial_arts',
    'Huyền Huyễn': 'auto_fix_high',
    'Đô Thị': 'location_city',
    'Khoa Huyễn': 'science',
    'Võng Du': 'computer',
    'Lịch Sử': 'history_edu',
    'Ngôn Tình': 'favorite',
    'Trọng Sinh': 'replay',
    'Xuyên Không': 'flight_takeoff',
    'Quân Sự': 'military_tech',
    'Trinh Thám': 'psychology',
    'Hài Hước': 'sentiment_very_satisfied',
    'Đam Mỹ': 'favorite_border',
    'Sắc Hiệp': 'nightlife',
    'Fantasy': 'local_fire_department',
    'Romance': 'favorite',
    'Action': 'flash_on',
    'Isekai': 'flight_takeoff',
    'Mystery': 'psychology',
    'Comedy': 'sentiment_very_satisfied',
    'Magic': 'auto_fix_high',
    'Slice of Life': 'cruelty_free',
    'Martial Arts': 'sports_martial_arts',
    'Historical': 'history_edu',
    'System': 'computer',
    'Sci-Fi': 'science',
};

const getGenreIcon = (name) => genreIcons[name] || 'category';

export default function LibraryPage() {
    const [genres, setGenres] = useState([]);
    const [stories, setStories] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [selectedStory, setSelectedStory] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [view, setView] = useState('genres');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadGenres();
    }, []);

    const loadGenres = async () => {
        setLoading(true);
        try {
            const res = await libraryAPI.getGenres();
            setGenres(res.data.genres || []);
            setView('genres');
            setSelectedGenre(null);
        } catch (err) {
            console.error('Load genres failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadStories = async (params = {}) => {
        setLoading(true);
        try {
            const res = await libraryAPI.getStories(params);
            setStories(res.data.stories || []);
            setPagination({
                page: res.data.page,
                pages: res.data.pages,
                total: res.data.total
            });
            setView('stories');
        } catch (err) {
            console.error('Load stories failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenreClick = (genreName) => {
        setSelectedGenre(genreName);
        loadStories({ genre: genreName, page: 1 });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSelectedGenre(null);
        loadStories({ search: searchQuery.trim(), page: 1 });
    };

    const handlePageChange = (newPage) => {
        const params = { page: newPage };
        if (selectedGenre) params.genre = selectedGenre;
        if (searchQuery.trim()) params.search = searchQuery.trim();
        loadStories(params);
    };

    const handleStoryClick = async (storyId) => {
        setLoading(true);
        try {
            const res = await libraryAPI.getStoryDetail(storyId);
            setSelectedStory(res.data);
            setView('detail');
        } catch (err) {
            console.error('Load story detail failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const goBack = () => {
        if (view === 'detail') {
            setSelectedStory(null);
            setView('stories');
        } else {
            loadGenres();
        }
    };

    return (
        <div className="max-w-6xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    {view !== 'genres' && (
                        <button
                            onClick={goBack}
                            className="p-1.5 rounded hover:bg-zinc-800 text-gray-300 hover:text-white transition-colors"
                        >
                            <span className="material-icons-outlined">arrow_back</span>
                        </button>
                    )}
                    <span className="material-icons-outlined text-2xl text-white">auto_stories</span>
                    <h1 className="text-2xl font-bold text-white">
                        {view === 'detail' ? selectedStory?.title : 'Novel Library'}
                    </h1>
                    {view === 'genres' && (
                        <span className="ml-2 text-xs font-bold bg-black border border-white px-2 py-1 text-white">
                            {genres.length} Categories
                        </span>
                    )}
                    {view === 'stories' && (
                        <span className="ml-2 text-xs font-bold bg-black border border-white px-2 py-1 text-white">
                            {pagination.total} novels
                        </span>
                    )}
                </div>

                {view === 'genres' && (
                    <div className="flex items-center gap-2">
                        {['all', 'recent', 'popular'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-none text-sm font-bold border border-white transition-colors ${filter === f
                                        ? 'bg-white text-black'
                                        : 'bg-black text-white hover:bg-zinc-900'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Search */}
            {view !== 'detail' && (
                <form onSubmit={handleSearch} className="flex gap-3 relative">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-icons-outlined text-white">search</span>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={view === 'genres' ? 'Search categories...' : 'Search novels...'}
                            className="block w-full pl-10 pr-3 py-3 bg-black border border-white text-white rounded-none placeholder-gray-400 focus:ring-1 focus:ring-white focus:border-white focus:outline-none sm:text-sm transition-colors"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-white hover:bg-gray-200 text-black font-bold py-2 px-8 rounded-none transition-colors border border-white disabled:opacity-50"
                    >
                        Search
                    </button>
                </form>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="material-icons text-3xl text-white animate-spin-slow">sync</span>
                </div>
            ) : view === 'genres' ? (
                /* Genre Grid */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                    {genres.map((g) => (
                        <button
                            key={g.name}
                            onClick={() => handleGenreClick(g.name)}
                            className="bg-zinc-900 p-6 flex flex-col items-center justify-center gap-3 hover:bg-zinc-800 transition-all border border-transparent hover:border-white group"
                        >
                            <span className="material-icons-outlined text-3xl text-white group-hover:scale-110 transition-transform">
                                {getGenreIcon(g.name)}
                            </span>
                            <div className="text-center">
                                <h3 className="font-bold text-lg text-white">{g.name}</h3>
                                <p className="text-sm text-gray-400 mt-1 font-medium">{g.count} novels</p>
                            </div>
                        </button>
                    ))}
                    {genres.length === 0 && (
                        <div className="col-span-full text-center py-16 text-gray-400">
                            <span className="material-icons-outlined text-4xl mb-3 block">library_books</span>
                            <p>No novels in the database yet. Crawl some first!</p>
                        </div>
                    )}
                </div>
            ) : view === 'stories' ? (
                /* Story List */
                <>
                    {selectedGenre && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <button onClick={loadGenres} className="hover:text-white transition-colors">Categories</button>
                            <span>/</span>
                            <span className="text-white font-medium">{selectedGenre}</span>
                        </div>
                    )}
                    <div className="space-y-3">
                        {stories.map((story) => (
                            <button
                                key={story.id}
                                onClick={() => handleStoryClick(story.id)}
                                className="w-full text-left bg-zinc-900 p-5 hover:bg-zinc-800 transition-all border border-transparent hover:border-white group"
                            >
                                <h3 className="font-bold text-lg text-white mb-2 group-hover:text-gray-200">{story.title}</h3>
                                <div className="flex flex-wrap gap-3 text-sm text-gray-400 mb-2">
                                    <span className="flex items-center gap-1">
                                        <span className="material-icons-outlined text-[16px]">person</span>
                                        {story.author || 'Unknown'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="material-icons-outlined text-[16px]">menu_book</span>
                                        {story.chapter_count} chương
                                    </span>
                                    <span className={`flex items-center gap-1 ${story.status === 'Full' ? 'text-green-400' : 'text-yellow-400'}`}>
                                        <span className="material-icons-outlined text-[16px]">
                                            {story.status === 'Full' ? 'check_circle' : 'schedule'}
                                        </span>
                                        {story.status || 'Đang ra'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {(story.genres || []).slice(0, 4).map((g) => (
                                        <span key={g} className="text-[11px] font-bold bg-black border border-white/30 text-gray-300 px-2 py-0.5">
                                            {g}
                                        </span>
                                    ))}
                                </div>
                                {story.description && (
                                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">{story.description}</p>
                                )}
                            </button>
                        ))}
                        {stories.length === 0 && (
                            <div className="text-center py-16 text-gray-400">
                                <span className="material-icons-outlined text-4xl mb-3 block">search_off</span>
                                <p>No novels found.</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-4">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="px-4 py-2 bg-black border border-white text-white text-sm font-bold hover:bg-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                ← Previous
                            </button>
                            <span className="text-sm text-gray-400">
                                Page {pagination.page} / {pagination.pages}
                            </span>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.pages}
                                className="px-4 py-2 bg-black border border-white text-white text-sm font-bold hover:bg-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </>
            ) : (
                /* Story Detail */
                selectedStory && (
                    <div className="bg-zinc-900 border border-white/20 p-8 space-y-6">
                        <h2 className="text-2xl font-bold text-white">{selectedStory.title}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Author</label>
                                <p className="text-white font-medium">{selectedStory.author || 'Unknown'}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Chapters</label>
                                <p className="text-white font-medium">{selectedStory.chapter_count} chương</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Status</label>
                                <p className={`font-medium ${selectedStory.status === 'Full' ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {selectedStory.status || 'Đang ra'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Genres</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {(selectedStory.genres || []).map((g) => (
                                        <span key={g} className="text-[11px] font-bold bg-black border border-white/30 text-gray-300 px-2 py-0.5">
                                            {g}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {selectedStory.description && (
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Description</label>
                                <p className="text-gray-300 leading-relaxed">{selectedStory.description}</p>
                            </div>
                        )}
                        {selectedStory.url && (
                            <a
                                href={selectedStory.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 bg-white hover:bg-gray-200 text-black font-bold px-6 py-3 text-sm transition-colors"
                            >
                                <span className="material-icons-outlined text-[18px]">open_in_new</span>
                                Read on TruyenFull
                            </a>
                        )}
                    </div>
                )
            )}
        </div>
    );
}
