import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import OTPInput from '../components/OTPInput';

export default function ResetPassword() {
    const [step, setStep] = useState(1); // 1: Verify OTP, 2: New Password
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const navigate = useNavigate();
    const identifier = sessionStorage.getItem('resetIdentifier');
    const resetEmail = sessionStorage.getItem('resetEmail');

    if (!identifier) {
        return (
            <div className="auth-container fade-in">
                <div className="auth-card glass-card">
                    <div className="alert alert-error">Session expired. Please request OTP again.</div>
                    <Link to="/forgot-password" className="btn btn-secondary">Request OTP</Link>
                </div>
            </div>
        );
    }

    const handleVerifyOTP = async (e, otpValue) => {
        if (e) e.preventDefault();
        const finalOtp = otpValue || otp;
        if (!finalOtp || finalOtp.length < 6) return;

        setError('');
        setLoading(true);

        try {
            await authAPI.verifyPasswordResetOTP({
                identifier,
                otp: finalOtp
            });
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || 'OTP verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (newPassword !== confirmPassword) {
            return setError('Passwords do not match');
        }

        if (newPassword.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        setLoading(true);

        try {
            await authAPI.resetPassword({
                identifier,
                otp,
                newPassword
            });
            setMessage('Password reset successful! Redirecting to login...');
            sessionStorage.removeItem('resetIdentifier');
            sessionStorage.removeItem('resetEmail');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container fade-in">
            <div className="auth-card glass-card">
                <div className="auth-header">
                    <span className="auth-icon">{step === 1 ? '🛡️' : '🔑'}</span>
                    <h1>{step === 1 ? 'Verify OTP' : 'New Password'}</h1>
                    <p>
                        {step === 1
                            ? 'Enter the 6-digit code sent to your email'
                            : 'Set a strong new password for your account'}
                    </p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}

                {step === 1 ? (
                    <form className="auth-form" onSubmit={handleVerifyOTP}>
                        <div className="form-group">
                            <label className="form-label">Email OTP</label>
                            <OTPInput
                                email={resetEmail}
                                onChange={setOtp}
                                onComplete={(val) => handleVerifyOTP(null, val)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={loading || otp.length < 6}
                        >
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </form>
                ) : (
                    <form className="auth-form" onSubmit={handleResetPassword}>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Min. 6 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Confirm your new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={loading}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    <p>Problem? <Link to="/forgot-password">Restart Process</Link></p>
                </div>
            </div>
        </div>
    );
}
