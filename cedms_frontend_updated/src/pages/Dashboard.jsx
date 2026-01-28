import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { documentsAPI } from '../services/api';
import DocumentList from '../components/DocumentList';
import UploadModal from '../components/UploadModal';
import SearchBar from '../components/SearchBar';
import './Dashboard.css';

export default function Dashboard() {
    const { user, logout, isManagerOrAdmin, isAdmin } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [filters, setFilters] = useState({});

    const fetchDocuments = async (searchFilters = {}) => {
        try {
            setLoading(true);
            const response = await documentsAPI.getAll(searchFilters);
            setDocuments(response.data.documents);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments(filters);
    }, [filters]);

    const handleUploadSuccess = () => {
        setShowUploadModal(false);
        fetchDocuments(filters);
    };

    const handleStatusUpdate = async (docId, status) => {
        try {
            await documentsAPI.updateStatus(docId, status);
            fetchDocuments(filters);
        } catch (error) {
            console.error('Failed to update status:', error);
            alert(error.response?.data?.error || 'Failed to update document status');
        }
    };

    const handleDownload = async (docId, filename) => {
        try {
            const response = await documentsAPI.download(docId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);

            // Handle error response
            let errorMessage = 'Download failed';

            if (error.response?.data) {
                // If error response is a Blob (from responseType: 'blob'), convert to text
                if (error.response.data instanceof Blob) {
                    try {
                        const text = await error.response.data.text();
                        const errorData = JSON.parse(text);
                        errorMessage = errorData.error || errorMessage;
                    } catch (e) {
                        errorMessage = 'Download failed - Invalid response';
                    }
                } else if (typeof error.response.data === 'object') {
                    errorMessage = error.response.data.error || errorMessage;
                } else {
                    errorMessage = error.response.data;
                }
            }

            alert(errorMessage);
        }
    };

    const handleDelete = async (docId) => {
        try {
            await documentsAPI.delete(docId);
            fetchDocuments(filters);
        } catch (error) {
            console.error('Delete failed:', error);
            alert(error.response?.data?.error || 'Failed to delete document');
        }
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="header-left">
                            <h1 className="logo">
                                <span className="logo-icon">🔒</span>
                                CEDMS
                            </h1>
                            <div className="user-badge" title={`User ID: ${user.id}`}>
                                <span className="user-name">{user.fullName}</span>
                                <span className="user-id-short">#{user.id.slice(0, 8)}</span>
                                <span className={`role-badge role-${user.role.toLowerCase()}`}>
                                    {user.role}
                                </span>
                            </div>
                        </div>
                        <div className="header-right">
                            {isManagerOrAdmin() && (
                                <Link to="/deleted-history" className="btn btn-secondary" style={{ marginRight: '10px' }}>
                                    🗑️ Deleted History
                                </Link>
                            )}
                            {isAdmin() && (
                                <Link to="/audit-logs" className="btn btn-secondary" style={{ marginRight: '10px' }}>
                                    📋 Audit Logs
                                </Link>
                            )}
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowUploadModal(true)}
                            >
                                📤 Upload Document
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={logout}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="dashboard-main">
                <div className="container">
                    <div className="dashboard-content">
                        <div className="content-header">
                            <h2>Document Management</h2>
                            <SearchBar
                                onSearch={setFilters}
                                showEmployeeFilter={isManagerOrAdmin()}
                            />
                        </div>

                        {loading ? (
                            <div className="loading-container">
                                <div className="spinner"></div>
                                <p>Loading documents...</p>
                            </div>
                        ) : (
                            <DocumentList
                                documents={documents}
                                onStatusUpdate={handleStatusUpdate}
                                onDownload={handleDownload}
                                onDelete={handleDelete}
                            />
                        )}
                    </div>
                </div>
            </main>

            {showUploadModal && (
                <UploadModal
                    onClose={() => setShowUploadModal(false)}
                    onSuccess={handleUploadSuccess}
                />
            )}
        </div>
    );
}
