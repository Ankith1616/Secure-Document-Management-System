import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import OTPInput from '../components/OTPInput';
import './Auth.css';

export default function Register() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        fullName: '',
        role: 'EMPLOYEE'
    });
    const [step, setStep] = useState(1); // 1: Info, 2: OTP
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { setAuth } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authAPI.requestRegistrationOTP(formData);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (otp) => {
        setError('');
        setLoading(true);

        try {
            const response = await authAPI.verifyRegistrationOTP({
                email: formData.email,
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
            await authAPI.requestRegistrationOTP(formData);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to resend OTP');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass-card">
                <div className="auth-header">
                    <div className="auth-icon">{step === 1 ? '✨' : '🔐'}</div>
                    <h1>{step === 1 ? 'Create Account' : 'Verify Email'}</h1>
                    <p>
                        {step === 1
                            ? 'Join the secure document management system'
                            : 'Enter the code sent to ' + formData.email}
                    </p>
                </div>

                {error && (
                    <div className="alert alert-error fade-in">
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleRequestOTP} className="auth-form">
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                name="fullName"
                                className="form-input"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="john@example.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                                type="text"
                                name="username"
                                className="form-input"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Choose a username"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                name="password"
                                className="form-input"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Create a strong password"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <select
                                name="role"
                                className="form-select"
                                value={formData.role}
                                onChange={handleChange}
                            >
                                <option value="EMPLOYEE">Employee</option>
                                <option value="MANAGER">Manager</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={loading}
                        >
                            {loading ? 'Sending OTP...' : 'Continue'}
                        </button>
                    </form>
                ) : (
                    <div className="otp-step">
                        <OTPInput
                            email={formData.email}
                            onComplete={handleVerifyOTP}
                            onResend={handleResendOTP}
                        />
                        <button
                            className="btn btn-secondary btn-full"
                            onClick={() => setStep(1)}
                            disabled={loading}
                        >
                            Back to Register
                        </button>
                    </div>
                )}

                <div className="auth-footer">
                    <p>Already have an account? <Link to="/login">Sign in</Link></p>
                </div>

                <div className="security-badge">
                    <span>🔐 MFA: Email-based OTP enabled</span>
                </div>
            </div>
        </div>
    );
}
