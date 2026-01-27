import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="w-full bg-gray-900 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Left: App Name */}
        <div className="text-xl font-bold text-green-500">
          CEDMS
        </div>

        {/* Center: Navigation */}
        <div className="flex items-center space-x-6 text-gray-300">
          <Link
            to="/documents"
            className="hover:text-green-400 transition"
          >
            Documents
          </Link>

          {(user.role === "EMPLOYEE" || user.role==="MANAGER" || user.role === "ADMIN") && (
            <Link
              to="/upload"
              className="hover:text-green-400 transition"
            >
              Upload
            </Link>
          )}

          {/* Admin-only Audit Logs */}
          {user.role === "ADMIN" && (
            <Link
              to="/audit"
              className="hover:text-green-400 transition"
            >
              Audit Logs
            </Link>
          )}
        </div>

        {/* Right: Role + Logout */}
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            Role: <span className="text-white">{user.role}</span>
          </span>

          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded text-sm transition"
          >
            Logout
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
