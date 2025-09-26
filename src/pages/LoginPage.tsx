import React, { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        login: '', // email sau telefon
        parola: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (error) setError('');
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store token
                localStorage.setItem('token', data.token);

                // Redirect to dashboard or home
                navigate('/dashboard');
            } else {
                setError(data.message || 'Eroare la autentificare');
            }
        } catch (err) {
            setError('Eroare de conectare. Verificați conexiunea la internet.');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    const isValidLogin = () => {
        return formData.login.length > 0 && formData.parola.length >= 6;
    };

    const getLoginIcon = () => {
        if (formData.login.includes('@')) {
            return <EnvelopeIcon className="h-5 w-5 text-gray-400" />;
        } else if (formData.login.match(/^[0-9+]/)) {
            return <PhoneIcon className="h-5 w-5 text-gray-400" />;
        }
        return <EnvelopeIcon className="h-5 w-5 text-gray-400" />;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center">
                        <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">🚗</span>
                        </div>
                        <h2 className="mt-6 text-3xl font-bold text-gray-900">
                            Conectează-te
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            la ITP NOTIFICATION
                        </p>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600 text-center">{error}</p>
                        </div>
                    )}

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="login" className="block text-sm font-medium text-gray-700">
                                    Email sau număr de telefon
                                </label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        {getLoginIcon()}
                                    </div>
                                    <input
                                        id="login"
                                        name="login"
                                        type="text"
                                        required
                                        value={formData.login}
                                        onChange={handleChange}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                        placeholder="exemplu@email.com sau 0712345678"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="parola" className="block text-sm font-medium text-gray-700">
                                    Parola
                                </label>
                                <div className="mt-1 relative">
                                    <input
                                        id="parola"
                                        name="parola"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={formData.parola}
                                        onChange={handleChange}
                                        className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                        placeholder="Parola ta"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        ) : (
                                            <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                    Ține-mă minte
                                </label>
                            </div>

                            <div className="text-sm">
                                <Link
                                    to="/forgot-password"
                                    className="font-medium text-blue-600 hover:text-blue-500 transition duration-200"
                                >
                                    Ai uitat parola?
                                </Link>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={!isValidLogin() || loading}
                                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white transition duration-200 ${
                                    isValidLogin() && !loading
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                                        : 'bg-gray-300 cursor-not-allowed'
                                }`}
                            >
                                {loading ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Se conectează...
                                    </div>
                                ) : (
                                    'Conectează-te'
                                )}
                            </button>
                        </div>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">Sau</span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <a
                                    href="/api/auth/github"
                                    className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition duration-200"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                                    </svg>
                                    Conectează-te cu GitHub
                                </a>
                            </div>
                        </div>

                        <div className="text-center">
                            <span className="text-sm text-gray-600">
                                Nu ai cont?{' '}
                                <Link
                                    to="/register"
                                    className="font-medium text-blue-600 hover:text-blue-500 transition duration-200"
                                >
                                    Înregistrează-te aici
                                </Link>
                            </span>
                        </div>
                    </form>
                </div>

                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        © 2025 MISEDA INSPECT SRL. Toate drepturile rezervate.
                    </p>
                </div>
            </div>
        </div>
    );
}