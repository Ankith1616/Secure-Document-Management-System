import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function ForgotPassword() {
    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const response = await authAPI.requestPasswordResetOTP({ identifier });
            setMessage('OTP has been sent to your registered email.');
            // Store identifier and email for the reset step
            sessionStorage.setItem('resetIdentifier', identifier);
            sessionStorage.setItem('resetEmail', response.data.email);
            setTimeout(() => navigate('/reset-password'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to request OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container fade-in">
            <div className="auth-card glass-card">
                <div className="auth-header">
                    <span className="auth-icon">🔐</span>
                    <h1>Forgot Password</h1>
                    <p>Enter your username or email to receive a reset OTP</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && <div className="alert alert-error">{error}</div>}
                    {message && <div className="alert alert-success">{message}</div>}

                    <div className="form-group">
                        <label className="form-label">Username or Email</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter your username or email"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={loading}
                    >
                        {loading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Remembered your password? <Link to="/login">Login</Link></p>
                </div>
            </div>
        </div>
    );
}
