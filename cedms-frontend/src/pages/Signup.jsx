import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const Signup = () => {
  const navigate = useNavigate();

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async () => {
    setError("");
    setMsg("");

    if (!employeeId || !password) {
      setError("Employee ID and Password required");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      setMsg("Signup successful! Please login.");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      console.error(err);
      setError("Server error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-10 rounded-xl w-full max-w-md shadow-2xl">
        <h2 className="text-3xl font-bold text-green-500 text-center mb-6">
          Sign Up
        </h2>

        <label className="block text-sm text-gray-300 mb-1">
          Employee ID
        </label>
        <input
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="w-full p-3 mb-4 rounded bg-gray-700 text-white"
          placeholder="EMP / MA / AD ID"
        />

        <label className="block text-sm text-gray-300 mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 rounded bg-gray-700 text-white"
          placeholder="Create password"
        />

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        {msg && <p className="text-green-400 text-sm mb-3">{msg}</p>}

        <button
          onClick={handleSignup}
          className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-semibold"
        >
          Sign Up
        </button>

        <p className="text-sm text-gray-400 mt-4 text-center">
          Already have an account?{" "}
          <Link to="/" className="text-green-400 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
