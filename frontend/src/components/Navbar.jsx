import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (!user) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    const navLinks = [
        { path: '/chat', icon: 'chat', label: 'Chat' },
        { path: '/library', icon: 'library_books', label: 'Library' },
    ];

    if (isAdmin) {
        navLinks.push({ path: '/admin', icon: 'settings', label: 'Admin' });
    }

    return (
        <nav className="bg-black border-b border-white/20 flex items-center justify-between px-6 py-3 shrink-0">
            {/* Brand */}
            <div className="flex items-center gap-2">
                <img src="/logo.jpg" alt="Novel AI" className="w-8 h-8 rounded-lg object-cover" />
                <Link to="/chat" className="font-bold text-lg tracking-tight text-white hover:text-gray-300 transition-colors">
                    Novel AI
                </Link>
            </div>

            {/* Nav Links */}
            <div className="hidden sm:flex items-center gap-1">
                {navLinks.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        className={`px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors ${isActive(link.path)
                            ? 'bg-zinc-800 text-white font-bold'
                            : 'text-gray-300 hover:bg-zinc-800'
                            }`}
                    >
                        <span className="material-icons text-sm">{link.icon}</span>
                        {link.label}
                    </Link>
                ))}
            </div>

            {/* User info + Logout */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-white border border-white/30">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <span className="material-icons-outlined text-sm">person</span>
                        )}
                    </div>
                    <span className="text-sm font-medium text-white hidden sm:block">{user.username}</span>
                    {isAdmin && (
                        <span className="text-[10px] font-bold bg-white text-black px-1.5 py-0.5 rounded tracking-wide uppercase hidden sm:block">
                            Admin
                        </span>
                    )}
                </div>
                <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Đăng xuất"
                >
                    <span className="material-icons-outlined text-xl">logout</span>
                </button>
            </div>
        </nav>
    );
}
