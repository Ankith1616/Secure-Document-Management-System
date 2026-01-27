import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { AuditContext } from "../context/AuditContext";
import { useNavigate } from "react-router-dom";

const ViewDocuments = () => {
  const { user } = useContext(AuthContext);
  const { addLog } = useContext(AuditContext);
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🔍 Search & Filters
  const [searchText, setSearchText] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  /* =========================
     AUTH CHECK
  ========================= */
  if (!user || !user.token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-400">
        Authentication required
      </div>
    );
  }

  /* =========================
     FETCH DOCUMENTS
  ========================= */
  useEffect(() => {
    fetch("http://localhost:5000/documents", {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        console.log("DOCUMENTS FROM BACKEND:", data);
        setDocuments(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load documents");
        setLoading(false);
      });
  }, [user.token]);

  /* =========================
     APPROVE / REJECT
  ========================= */
  const updateStatus = async (docId, status) => {
    try {
      const res = await fetch(
        `http://localhost:5000/documents/${docId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!res.ok) throw new Error();

      const updatedDoc = await res.json();

      setDocuments((prev) =>
        prev.map((doc) => (doc.id === docId ? updatedDoc : doc))
      );

      addLog(
        `Document "${updatedDoc.name}" ${status.toLowerCase()} by ${user.username}`,
        user
      );
    } catch {
      setError("Failed to update document status");
    }
  };

  /* =========================
     DOWNLOAD (APPROVED ONLY)
  ========================= */
  const handleDownload = async (doc) => {
    try {
      const res = await fetch(
        `http://localhost:5000/download/${doc.id}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      addLog(`Downloaded document "${doc.name}"`, user);
    } catch {
      alert("Download failed");
    }
  };

  /* =========================
     FILTER LOGIC
  ========================= */
  const visibleDocs = documents.filter((doc) => {
  // EMPLOYEE → own docs only
  if (user.role === "EMPLOYEE" && doc.uploadedBy !== user.username) {
    return false;
  }

  // TEXT SEARCH
  if (
    searchText &&
    !doc.name.toLowerCase().includes(searchText.toLowerCase())
  ) {
    return false;
  }

  // ✅ DATE FILTER (WORKS FOR OLD + NEW DATA)
  if (searchDate) {
    const docDate = doc.uploadedDate
      ? doc.uploadedDate
      : doc.uploadedAt
          .split(",")[0]
          .split("/")
          .reverse()
          .join("-");

    if (docDate !== searchDate) return false;
  }

  // EMPLOYEE ID FILTER (Manager/Admin)
  if (
    (user.role === "MANAGER" || user.role === "ADMIN") &&
    searchEmployeeId &&
    !doc.uploadedBy.toLowerCase().includes(searchEmployeeId.toLowerCase())
  ) {
    return false;
  }

  return true;
});



  /* =========================
    LOADING / ERROR
  ========================= */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading documents...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-400">
        {error}
      </div>
    );
  }

  /* =========================
     UI
  ========================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white px-8 py-6">
      <div className="max-w-6xl mx-auto">

        {/* 🔝 TOP BAR */}
        <div className="flex items-center justify-between bg-gray-800 px-4 py-3 rounded-xl mb-6">

          {/* 🔍 SEARCH */}
          <div className="flex items-center gap-3 w-full">
            <span className="text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="bg-transparent outline-none text-white w-full"
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3 ml-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
            >
              Filters
            </button>

            <button
              onClick={() => navigate("/upload")}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-semibold"
            >
              Upload
            </button>
          </div>
        </div>

        {/* 🎛️ FILTER PANEL */}
        {showFilters && (
          <div className="bg-gray-800 p-4 rounded-xl mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-400">Date</label>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="bg-gray-700 text-white px-3 py-2 rounded w-full"
              />
            </div>

            {(user.role === "MANAGER" || user.role === "ADMIN") && (
              <div>
                <label className="text-sm text-gray-400">Employee ID</label>
                <input
                  type="text"
                  placeholder="EMP / MA / AD"
                  value={searchEmployeeId}
                  onChange={(e) => setSearchEmployeeId(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-2 rounded w-full"
                />
              </div>
            )}
          </div>
        )}

        {/* 📄 DOCUMENTS */}
        {visibleDocs.length === 0 ? (
          <p className="text-gray-400">No documents found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleDocs.map((doc) => (
              <div
                key={doc.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg"
              >
                <p className="text-lg font-semibold">{doc.name}</p>

                <p className="text-sm text-gray-400">
                  Uploaded by <span className="text-white">{doc.uploadedBy}</span>
                </p>

                <p className="text-sm text-gray-400">
                  Uploaded at {doc.uploadedAt}
                </p>

                <span
                  className={`inline-block mt-2 px-3 py-1 text-xs rounded-full ${
                    doc.status === "APPROVED"
                      ? "bg-green-600"
                      : doc.status === "REJECTED"
                      ? "bg-red-600"
                      : "bg-yellow-600"
                  }`}
                >
                  {doc.status}
                </span>

                {doc.status === "APPROVED" && (
                  <p className="mt-2 text-sm text-green-400">
                    Approved by <b>{doc.approvedBy}</b> on {doc.approvedAt}
                  </p>
                )}

                {doc.status === "REJECTED" && (
                  <p className="mt-2 text-sm text-red-400">
                    Rejected by <b>{doc.rejectedBy}</b> on {doc.rejectedAt}
                  </p>
                )}

                {doc.status === "APPROVED" && (
                  <button
                    onClick={() => handleDownload(doc)}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
                  >
                    Download
                  </button>
                )}

                {(user.role === "MANAGER" || user.role === "ADMIN") &&
                  doc.status === "PENDING" && (
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => updateStatus(doc.id, "APPROVED")}
                        className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(doc.id, "REJECTED")}
                        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewDocuments;
