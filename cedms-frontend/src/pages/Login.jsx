import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuditContext } from "../context/AuditContext";

const Login = () => {
  const navigate = useNavigate();
  const { addLog } = useContext(AuditContext);

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    const trimmedId = employeeId.trim();

    if (!trimmedId || !password) {
      setError("Employee ID and Password are required");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: trimmedId, // ✅ backend expects employeeId
          password: password,
        }),
      });

      const data = await response.json();

      // ✅ Handle backend errors clearly
      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // ✅ OTP simulation
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiryTime = Date.now() + 60 * 1000;

      console.log("Generated OTP:", otp);

      // ✅ Store pending user data for OTP verification
      sessionStorage.setItem(
        "pendingUser",
        JSON.stringify({
          username: trimmedId,
          role: data.role,
          token: data.token,
        })
      );

      sessionStorage.setItem("generatedOtp", otp);
      sessionStorage.setItem("otpExpiry", expiryTime.toString());

      // ✅ Audit log
      addLog("Login attempt initiated", {
        username: trimmedId,
        role: data.role,
      });

      navigate("/otp");
    } catch (err) {
      console.error(err);
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <div className="bg-gray-800 p-10 rounded-xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-green-500 text-center mb-8">
          CEDMS Login
        </h2>

        {/* Employee ID */}
        <label className="block mb-1 text-sm text-gray-300">
          Employee ID
        </label>
        <input
          type="text"
          placeholder="EMP / MA / AD ID"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="w-full p-3 mb-4 rounded bg-gray-700 text-white focus:outline-none"
        />

        {/* Password */}
        <label className="block mb-1 text-sm text-gray-300">
          Password
        </label>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 rounded bg-gray-700 text-white focus:outline-none"
        />

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm mb-4">
            {error}
          </p>
        )}

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className={`w-full py-3 rounded font-semibold transition ${
            loading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Signup Link */}
        <p className="text-sm text-gray-400 mt-4 text-center">
          New user?{" "}
          <Link to="/signup" className="text-green-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
