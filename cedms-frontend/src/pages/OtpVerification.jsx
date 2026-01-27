import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { AuditContext } from "../context/AuditContext";


const OtpVerification = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { addLog } = useContext(AuditContext);
  const storedUser = JSON.parse(sessionStorage.getItem("pendingUser"));
  const generatedOtp = sessionStorage.getItem("generatedOtp");
  const expiry = sessionStorage.getItem("otpExpiry");

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (!expiry) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        Math.floor((expiry - Date.now()) / 1000),
        0
      );
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiry]);

  const handleVerify = () => {
    if (Date.now() > expiry) {
      setError("OTP expired. Please resend OTP.");
      return;
    }

    if (otp === generatedOtp) {
      login(storedUser);

      sessionStorage.removeItem("pendingUser");
      sessionStorage.removeItem("generatedOtp");
      sessionStorage.removeItem("otpExpiry");

      if (storedUser.role === "EMPLOYEE") navigate("/employee");
      if (storedUser.role === "MANAGER") navigate("/manager");
      if (storedUser.role === "ADMIN") navigate("/admin");
    } else {
      setError("Invalid OTP");
    }
  };

  const handleResendOtp = () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpiry = Date.now() + 60 * 1000;

    sessionStorage.setItem("generatedOtp", newOtp);
    sessionStorage.setItem("otpExpiry", newExpiry.toString());

    console.log("Resent OTP:", newOtp);
    setError("");
    setOtp("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded shadow-lg w-full max-w-md text-white">
        <h2 className="text-2xl font-bold text-green-400 text-center mb-6">
          OTP Verification
        </h2>

        <input
          type="text"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full p-3 mb-4 rounded bg-gray-700 text-white"
        />

        {timeLeft > 0 ? (
          <p className="text-sm text-gray-400 mb-2">
            OTP expires in <span className="text-green-400">{timeLeft}</span> seconds
          </p>
        ) : (
          <p className="text-sm text-red-400 mb-2">
            OTP expired
          </p>
        )}

        {error && (
          <p className="text-red-400 text-sm mb-4">
            {error}
          </p>
        )}

        <button
          onClick={handleVerify}
          className="w-full bg-green-600 hover:bg-green-700 py-2 rounded mb-3"
        >
          Verify OTP
        </button>

        <button
          onClick={handleResendOtp}
          className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded"
        >
          Resend OTP
        </button>
      </div>
    </div>
  );
};

export default OtpVerification;
