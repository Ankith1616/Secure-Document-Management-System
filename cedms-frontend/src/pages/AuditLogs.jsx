import { useContext } from "react";
import { AuditContext } from "../context/AuditContext";
import { AuthContext } from "../context/AuthContext";

const AuditLogs = () => {
  const { logs } = useContext(AuditContext);
  const { user } = useContext(AuthContext);

  // Admin-only access
  if (!user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-500">
        Access Denied
      </div>
    );
  }

  // Clear logs (admin only)
  const clearLogs = () => {
    localStorage.removeItem("auditLogs");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-green-400">
            Audit Logs
          </h2>

          {/* Clear Logs Button */}
          <button
            onClick={clearLogs}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
          >
            Clear Logs
          </button>
        </div>

        {/* Logs */}
        {logs.length === 0 ? (
          <p className="text-gray-400 text-center">
            No audit logs available.
          </p>
        ) : (
          <ul className="space-y-3">
            {logs.map((log, index) => (
              <li
                key={index}
                className="bg-gray-800 p-4 rounded"
              >
                <p><b>User:</b> {log.userId}</p>
                <p><b>Role:</b> {log.role}</p>
                <p><b>Action:</b> {log.action}</p>
                <p className="text-sm text-gray-400">
                  {log.time}
                </p>
              </li>
            ))}
          </ul>
        )}

      </div>
    </div>
  );
};

export default AuditLogs;
