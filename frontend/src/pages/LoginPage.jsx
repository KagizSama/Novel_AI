import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/chat');
        } catch (err) {
            setError(err.response?.data?.detail || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-black text-white min-h-screen flex items-center justify-center relative overflow-hidden font-display antialiased">
            {/* Background glow effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-[100px]"></div>
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md bg-[#0A0A0A] backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-white p-8 m-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/10">
                            <span className="material-icons text-black text-2xl">auto_stories</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Novel AI</h1>
                    <p className="text-sm text-gray-400">Welcome back. Please login to your account.</p>
                </div>

                {/* Error alert */}
                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-white mb-1 flex items-center gap-2" htmlFor="email">
                            <span className="material-icons text-[18px] text-gray-400">email</span>
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            autoComplete="email"
                            className="appearance-none block w-full px-4 py-3 border border-[#333333] rounded-lg bg-black text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-colors sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white mb-1 flex items-center gap-2" htmlFor="password">
                            <span className="material-icons text-[18px] text-gray-400">lock</span>
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                            className="appearance-none block w-full px-4 py-3 border border-[#333333] rounded-lg bg-black text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-colors sm:text-sm"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-black focus:ring-white border-[#333333] rounded bg-black cursor-pointer"
                            />
                            <label className="ml-2 block text-sm text-gray-400 cursor-pointer" htmlFor="remember-me">
                                Remember me
                            </label>
                        </div>
                        <div className="text-sm">
                            <a href="#" className="font-medium text-white hover:text-gray-300 transition-colors">
                                Forgot password?
                            </a>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-black bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-black shadow-lg shadow-white/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                            <span className="material-icons text-black/70 group-hover:text-black/100 transition-colors">login</span>
                        </span>
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 text-center text-sm">
                    <p className="text-gray-400">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-medium text-white hover:text-gray-300 transition-colors ml-1">
                            Register now
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
