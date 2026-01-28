import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { documentsAPI } from '../services/api';
import './DeletedHistory.css';

export default function DeletedHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                const response = await documentsAPI.getDeletedHistory();
                setHistory(response.data.history);
            } catch (err) {
                console.error('Failed to fetch deleted history:', err);
                setError('Failed to retrieve deleted documents history.');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    return (
        <div className="deleted-history-container container fade-in">
            <header className="history-header">
                <div className="header-content">
                    <h1>🗑️ Deleted Files History</h1>
                    <p>Track all file deletions and security purges</p>
                </div>
                <Link to="/dashboard" className="btn btn-secondary">
                    Back to Dashboard
                </Link>
            </header>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="history-table-wrapper glass-card">
                <table className="table history-table">
                    <thead>
                        <tr>
                            <th>Deletion Time</th>
                            <th>Filename</th>
                            <th>Original ID</th>
                            <th>Deleted By</th>
                            <th>IP Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((item, index) => (
                            <tr key={index} className="fade-in">
                                <td className="timestamp">{new Date(item.timestamp).toLocaleString()}</td>
                                <td className="filename">
                                    <span className="file-icon">📄</span>
                                    {item.filename}
                                </td>
                                <td className="doc-id">
                                    <code>{item.docId.slice(0, 8)}...</code>
                                </td>
                                <td>
                                    <div className="user-info">
                                        <span className="user-name">{item.deletedBy}</span>
                                        <span className="user-role">{item.role}</span>
                                    </div>
                                </td>
                                <td className="ip-cell">{item.ip}</td>
                            </tr>
                        ))}
                        {history.length === 0 && !loading && (
                            <tr>
                                <td colSpan="5" className="text-center py-4">No deletion history found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
