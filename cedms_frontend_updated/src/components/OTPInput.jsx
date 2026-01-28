import { useState, useRef, useEffect } from 'react';
import './OTPInput.css';

export default function OTPInput({ length = 6, onComplete, onChange, onResend, expiryMinutes = 5, email }) {
    const [otp, setOtp] = useState(new Array(length).fill(''));
    const [minutes, setMinutes] = useState(expiryMinutes);
    const [seconds, setSeconds] = useState(0);
    const inputRefs = useRef([]);

    // Countdown timer
    useEffect(() => {
        let timer = setInterval(() => {
            if (seconds > 0) {
                setSeconds(seconds - 1);
            }
            if (seconds === 0) {
                if (minutes === 0) {
                    clearInterval(timer);
                } else {
                    setMinutes(minutes - 1);
                    setSeconds(59);
                }
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [minutes, seconds]);

    const handleChange = (element, index) => {
        if (isNaN(element.value)) return false;

        const newOtp = [...otp];
        newOtp[index] = element.value;
        setOtp(newOtp);

        const otpValue = newOtp.join('');
        if (onChange) onChange(otpValue);

        // Move to next input if value is entered
        if (element.value !== '' && index < length - 1) {
            inputRefs.current[index + 1].focus();
        }

        // Check if all fields are filled
        if (newOtp.every(val => val !== '')) {
            if (onComplete) onComplete(otpValue);
        }
    };

    const handleKeyDown = (e, index) => {
        // Handle backspace
        if (e.key === 'Backspace') {
            if (otp[index] === '' && index > 0) {
                inputRefs.current[index - 1].focus();
            }
        }
    };

    const handlePaste = (e) => {
        const data = e.clipboardData.getData('text').slice(0, length);
        if (!/^\d+$/.test(data)) return;

        const pasteData = data.split('');
        const newOtp = [...otp];
        pasteData.forEach((char, i) => {
            if (i < length) newOtp[i] = char;
        });
        setOtp(newOtp);

        const otpValue = newOtp.join('');
        if (onChange) onChange(otpValue);

        // Focus the last input filled or next available
        const lastIndex = Math.min(pasteData.length, length - 1);
        inputRefs.current[lastIndex].focus();

        if (newOtp.every(val => val !== '')) {
            if (onComplete) onComplete(otpValue);
        }
    };

    const handleResendClick = () => {
        setMinutes(expiryMinutes);
        setSeconds(0);
        setOtp(new Array(length).fill(''));
        inputRefs.current[0].focus();
        onResend();
    };

    return (
        <div className="otp-input-container">
            <div className="otp-header">
                <h3>Enter Verification Code</h3>
                <p>A 6-digit code has been sent to <strong>{email}</strong></p>
            </div>

            <div className="otp-inputs">
                {otp.map((data, index) => (
                    <input
                        key={index}
                        type="text"
                        maxLength="1"
                        value={data}
                        ref={el => inputRefs.current[index] = el}
                        onChange={e => handleChange(e.target, index)}
                        onKeyDown={e => handleKeyDown(e, index)}
                        onPaste={handlePaste}
                        className="otp-field"
                    />
                ))}
            </div>

            <div className="otp-timer">
                {minutes === 0 && seconds === 0 ? (
                    <span className="text-danger">Code expired</span>
                ) : (
                    <span>Expires in: <strong>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</strong></span>
                )}
            </div>

            <div className="otp-footer">
                <p>Didn't receive the code?</p>
                <button
                    type="button"
                    className="btn-link"
                    onClick={handleResendClick}
                >
                    Resend Code
                </button>
            </div>
        </div>
    );
}
