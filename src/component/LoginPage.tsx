import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Shield } from 'lucide-react';

interface AuthPageProps {
    onLogin: (token: string, email: string) => void;
}

type AuthMode = 'login' | 'register' | 'verify';

const AuthPage = ({ onLogin }: AuthPageProps) => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:8000/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const result = await response.json();

            if (response.ok) {
                onLogin(result.access_token, result.user.email);
            } else {
                setError(result.detail || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('Network error during login');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const result = await response.json();

            if (response.ok) {
                setSuccess('Registration successful! Check your console for verification code.');
                setMode('verify');
                // Show demo code in alert for demo purposes
                if (result.demo_code) {
                    alert(`Demo Mode: Your verification code is ${result.demo_code}`);
                }
            } else {
                setError(result.detail || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setError('Network error during registration');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:8000/auth/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, code: verificationCode }),
            });

            const result = await response.json();

            if (response.ok) {
                onLogin(result.access_token, result.user.email);
            } else {
                setError(result.detail || 'Verification failed');
            }
        } catch (error) {
            console.error('Verification error:', error);
            setError('Network error during verification');
        } finally {
            setIsLoading(false);
        }
    };

    const resendVerificationCode = async () => {
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('http://localhost:8000/auth/send-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const result = await response.json();

            if (response.ok) {
                setSuccess('Verification code resent! Check your console.');
                if (result.demo_code) {
                    alert(`Demo Mode: Your verification code is ${result.demo_code}`);
                }
            } else {
                setError(result.detail || 'Failed to resend verification code');
            }
        } catch (error) {
            console.error('Resend error:', error);
            setError('Network error');
        } finally {
            setIsLoading(false);
        }
    };

    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label className="input-label">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="professional-input"
                    placeholder="your@email.com"
                    required
                />
            </div>

            <div>
                <label className="input-label">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Password
                </label>
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="professional-input pr-10"
                        placeholder="Your password"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                        ) : (
                            <Eye className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="create-vm-button w-full"
            >
                <LogIn className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Logging in...' : 'Login'}
            </button>

            <div className="text-center">
                <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-blue-600 hover:text-blue-800 underline"
                >
                    Don't have an account? Register here
                </button>
            </div>
        </form>
    );

    const renderRegisterForm = () => (
        <form onSubmit={handleRegister} className="space-y-6">
            <div>
                <label className="input-label">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="professional-input"
                    placeholder="your@email.com"
                    required
                />
            </div>

            <div>
                <label className="input-label">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Password
                </label>
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="professional-input pr-10"
                        placeholder="Choose a password (min 6 chars)"
                        required
                        minLength={6}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                        ) : (
                            <Eye className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            <div>
                <label className="input-label">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Confirm Password
                </label>
                <div className="relative">
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="professional-input pr-10"
                        placeholder="Confirm your password"
                        required
                        minLength={6}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                        ) : (
                            <Eye className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="create-vm-button w-full"
            >
                <UserPlus className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="text-center">
                <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-blue-600 hover:text-blue-800 underline"
                >
                    Already have an account? Login here
                </button>
            </div>
        </form>
    );

    const renderVerificationForm = () => (
        <form onSubmit={handleVerification} className="space-y-6">
            <div className="text-center mb-4">
                <p className="text-slate-600">
                    We've sent a verification code to <strong>{email}</strong>
                </p>
                <p className="text-sm text-slate-500 mt-2">
                    Check your console for the demo verification code.
                </p>
            </div>

            <div>
                <label className="input-label">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Verification Code
                </label>
                <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="professional-input text-center tracking-widest"
                    placeholder="123456"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                />
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="create-vm-button w-full"
            >
                <Shield className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Verifying...' : 'Verify Account'}
            </button>

            <div className="text-center space-y-2">
                <button
                    type="button"
                    onClick={resendVerificationCode}
                    disabled={isLoading}
                    className="text-blue-600 hover:text-blue-800 underline"
                >
                    Resend verification code
                </button>
                <br />
                <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-slate-600 hover:text-slate-800 underline text-sm"
                >
                    Back to registration
                </button>
            </div>
        </form>
    );

    const getTitle = () => {
        switch (mode) {
            case 'login': return 'Login to VM Manager';
            case 'register': return 'Create VM Manager Account';
            case 'verify': return 'Verify Your Email';
            default: return 'VM Manager Auth';
        }
    };

    const getIcon = () => {
        switch (mode) {
            case 'login': return <LogIn className="w-6 h-6 text-white" />;
            case 'register': return <UserPlus className="w-6 h-6 text-white" />;
            case 'verify': return <Shield className="w-6 h-6 text-white" />;
            default: return <LogIn className="w-6 h-6 text-white" />;
        }
    };

    return (
        <div className="min-h-screen professional-bg flex items-center justify-center">
            <div className="bg-effects">
                <div className="subtle-effect effect-1"></div>
                <div className="subtle-effect effect-2"></div>
            </div>

            <div className="w-full max-w-md">
                <div className="config-panel">
                    <div className="panel-header">
                        <div className="panel-icon">
                            {getIcon()}
                        </div>
                        <h2 className="panel-title">{getTitle()}</h2>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                            {success}
                        </div>
                    )}

                    {mode === 'login' && renderLoginForm()}
                    {mode === 'register' && renderRegisterForm()}
                    {mode === 'verify' && renderVerificationForm()}
                </div>
            </div>
        </div>
    );
};

export default AuthPage;