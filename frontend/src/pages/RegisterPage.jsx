import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await register(email, username, password);
            navigate('/chat');
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed');
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

            {/* Register Card */}
            <div className="relative z-10 w-full max-w-md bg-[#0A0A0A] backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-white p-8 m-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/10">
                            <span className="material-icons text-black text-2xl">person_add</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Create Account</h1>
                    <p className="text-sm text-gray-400">Join Novel AI to get started.</p>
                </div>

                {/* Error alert */}
                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-white mb-1 flex items-center gap-2" htmlFor="reg-username">
                            <span className="material-icons text-[18px] text-gray-400">person</span>
                            Display Name
                        </label>
                        <input
                            id="reg-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Your name"
                            required
                            minLength={2}
                            className="appearance-none block w-full px-4 py-3 border border-[#333333] rounded-lg bg-black text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-colors sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white mb-1 flex items-center gap-2" htmlFor="reg-email">
                            <span className="material-icons text-[18px] text-gray-400">email</span>
                            Email Address
                        </label>
                        <input
                            id="reg-email"
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
                        <label className="block text-sm font-medium text-white mb-1 flex items-center gap-2" htmlFor="reg-password">
                            <span className="material-icons text-[18px] text-gray-400">lock</span>
                            Password
                        </label>
                        <input
                            id="reg-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            required
                            minLength={6}
                            className="appearance-none block w-full px-4 py-3 border border-[#333333] rounded-lg bg-black text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-colors sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white mb-1 flex items-center gap-2" htmlFor="reg-confirm">
                            <span className="material-icons text-[18px] text-gray-400">lock</span>
                            Confirm Password
                        </label>
                        <input
                            id="reg-confirm"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            required
                            className="appearance-none block w-full px-4 py-3 border border-[#333333] rounded-lg bg-black text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-colors sm:text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-black bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-black shadow-lg shadow-white/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                            <span className="material-icons text-black/70 group-hover:text-black/100 transition-colors">person_add</span>
                        </span>
                        {loading ? 'Creating...' : 'Create Account'}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 text-center text-sm">
                    <p className="text-gray-400">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-white hover:text-gray-300 transition-colors ml-1">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
