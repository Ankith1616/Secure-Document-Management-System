import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { AuditContext } from "../context/AuditContext";

const UploadDocument = () => {
  const { user } = useContext(AuthContext);
  const { addLog } = useContext(AuditContext);

  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    if (!user || !user.token) {
      setMessage("Authentication required. Please login again.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadedBy", user.username);
      formData.append("role", user.role);

      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`, // ✅ JWT
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      addLog(`Uploaded document "${data.doc.name}"`, user);

      setMessage(`File "${data.doc.name}" uploaded successfully.`);
      setFile(null);
    } catch (error) {
      console.error(error);
      setMessage("File upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex justify-center items-center">
      <div className="bg-gray-800 p-6 rounded w-full max-w-md shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-green-400">
          Upload Document
        </h2>

        <input
          type="file"
          onChange={handleFileChange}
          className="mb-4 block w-full text-sm text-gray-300"
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className={`px-4 py-2 rounded w-full ${
            loading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? "Uploading..." : "Upload"}
        </button>

        {message && (
          <p className="mt-4 text-center text-green-300">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default UploadDocument;
