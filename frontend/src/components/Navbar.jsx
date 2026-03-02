import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiMessageSquare, FiBook, FiSettings, FiLogOut, FiUser } from 'react-icons/fi';

export default function Navbar() {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (!user) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

    return (
        <nav className="navbar">
            <div className="nav-brand">
                <Link to="/chat">📖 TruyenCrawler</Link>
            </div>
            <div className="nav-links">
                <Link to="/chat" className={isActive('/chat')}>
                    <FiMessageSquare /> <span>Chat</span>
                </Link>
                <Link to="/library" className={isActive('/library')}>
                    <FiBook /> <span>Thư viện</span>
                </Link>
                {isAdmin && (
                    <Link to="/admin" className={isActive('/admin')}>
                        <FiSettings /> <span>Admin</span>
                    </Link>
                )}
            </div>
            <div className="nav-user">
                <div className="user-info">
                    {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="user-avatar" />
                    ) : (
                        <div className="user-avatar-placeholder"><FiUser /></div>
                    )}
                    <span className="user-name">{user.username}</span>
                    {isAdmin && <span className="badge-admin">Admin</span>}
                </div>
                <button onClick={handleLogout} className="btn-logout" title="Đăng xuất">
                    <FiLogOut />
                </button>
            </div>
        </nav>
    );
}
