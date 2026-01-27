import { createContext, useEffect, useState } from "react";

export const AuditContext = createContext();

export const AuditProvider = ({ children }) => {
  const [logs, setLogs] = useState(() => {
    // Load existing logs from localStorage
    const stored = localStorage.getItem("auditLogs");
    return stored ? JSON.parse(stored) : [];
  });

  const addLog = (action, user) => {
    const entry = {
      userId: user?.username || "UNKNOWN",
      role: user?.role || "UNKNOWN",
      action,
      time: new Date().toLocaleString(),
    };

    setLogs((prev) => [...prev, entry]);
  };

  // Persist logs to localStorage
  useEffect(() => {
    localStorage.setItem("auditLogs", JSON.stringify(logs));
  }, [logs]);

  return (
    <AuditContext.Provider value={{ logs, addLog }}>
      {children}
    </AuditContext.Provider>
  );
};
