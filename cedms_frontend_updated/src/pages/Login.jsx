import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import OTPInput from '../components/OTPInput';
import './Auth.css';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState(''); // Received from backend after password match
    const [step, setStep] = useState(1); // 1: Password, 2: OTP
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { setAuth } = useAuth();
    const navigate = useNavigate();

    const handleRequestLoginOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authAPI.requestLoginOTP({ username, password });
            setEmail(response.data.email);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyLoginOTP = async (otp) => {
        setError('');
        setLoading(true);

        try {
            const response = await authAPI.verifyLoginOTP({
                email,
                otp
            });
            const { user, token } = response.data;
            setAuth(user, token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'OTP verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setError('');
        try {
            await authAPI.requestLoginOTP({ username, password });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to resend OTP');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass-card">
                <div className="auth-header">
                    <div className="auth-icon">{step === 1 ? '🔒' : '🛡️'}</div>
                    <h1>{step === 1 ? 'Welcome Back' : 'Two-Factor Auth'}</h1>
                    <p>
                        {step === 1
                            ? 'Sign in to access CEDMS'
                            : 'Enter the verification code sent to your email'}
                    </p>
                </div>

                {error && (
                    <div className="alert alert-error fade-in">
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleRequestLoginOTP} className="auth-form">
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                                type="text"
                                className="form-input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        <div className="auth-options">
                            <Link to="/forgot-password">Forgot Password?</Link>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={loading}
                        >
                            {loading ? 'Verifying...' : 'Sign In'}
                        </button>
                    </form>
                ) : (
                    <div className="otp-step">
                        <OTPInput
                            email={email}
                            onComplete={handleVerifyLoginOTP}
                            onResend={handleResendOTP}
                        />
                        <button
                            className="btn btn-secondary btn-full"
                            onClick={() => setStep(1)}
                            disabled={loading}
                        >
                            Back to Login
                        </button>
                    </div>
                )}

                <div className="auth-footer">
                    <p>Don't have an account? <Link to="/register">Register here</Link></p>
                </div>

                <div className="security-badge">
                    <span>🔐 MFA: Protected by Email OTP</span>
                </div>
            </div>
        </div>
    );
}
