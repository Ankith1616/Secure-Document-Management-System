import { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import './AuditLogs.css';

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [integrity, setIntegrity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        action: '',
        status: '',
        userId: '',
        startDate: '',
        endDate: ''
    });

    const fetchLogs = async (currentFilters) => {
        setLoading(true);
        try {
            const response = await auditAPI.getLogs(currentFilters);
            setLogs(response.data.logs);
            setIntegrity(response.data.integrity);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(filters);
    }, []);

    const handleFilterChange = (e) => {
        const newFilters = { ...filters, [e.target.name]: e.target.value };
        setFilters(newFilters);
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchLogs(filters);
    };

    const handleClearLogs = async () => {
        if (!window.confirm('⚠️ Are you sure you want to PERMANENTLY CLEAR all audit logs? This action cannot be undone and will be logged.')) {
            return;
        }

        try {
            setLoading(true);
            await auditAPI.clearLogs();
            fetchLogs(filters); // Refresh logs (will show the 'Audit Logs Cleared' entry)
            alert('Audit logs have been cleared.');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to clear logs');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        return status === 'SUCCESS' ? 'text-success' : 'text-danger';
    };

    const formatAction = (action) => {
        return action.replace(/_/g, ' ');
    };

    return (
        <div className="audit-container container fade-in">
            <header className="audit-header">
                <div className="header-content">
                    <h1>🔐 System Audit Logs</h1>
                    <p>Tamper-evident logs of all security-sensitive actions</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-outline-danger"
                        onClick={handleClearLogs}
                        disabled={loading || logs.length === 0}
                    >
                        🗑️ Clear Logs
                    </button>
                    {integrity && (
                        <div className={`integrity-badge ${integrity.isValid ? 'valid' : 'tampered'}`}>
                            {integrity.isValid ? '🛡️ Integrity Verified' : '⚠️ Tamper Detected'}
                            <span className="integrity-msg">{integrity.message}</span>
                        </div>
                    )}
                </div>
            </header>

            <section className="filter-section glass-card">
                <form onSubmit={handleFilterSubmit} className="audit-filters">
                    <div className="filter-group">
                        <label>Action</label>
                        <select name="action" value={filters.action} onChange={handleFilterChange} className="form-select">
                            <option value="">All Actions</option>
                            <option value="LOGIN_REQUEST">Login Request</option>
                            <option value="LOGIN_COMPLETE">Login Success</option>
                            <option value="REGISTRATION_REQUEST">Registration Request</option>
                            <option value="REGISTRATION_COMPLETE">Registration Success</option>
                            <option value="DOCUMENT_UPLOAD">Upload</option>
                            <option value="DOCUMENT_DOWNLOAD">Download</option>
                            <option value="DOCUMENT_STATUS_UPDATE">Status Update</option>
                            <option value="DOCUMENT_DELETE">Delete</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Status</label>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="form-select">
                            <option value="">All Statuses</option>
                            <option value="SUCCESS">Success</option>
                            <option value="FAILURE">Failure</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>User ID</label>
                        <input
                            type="text"
                            name="userId"
                            value={filters.userId}
                            onChange={handleFilterChange}
                            placeholder="Search by ID"
                            className="form-input"
                        />
                    </div>

                    <div className="filter-group">
                        <label>Start Date</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="form-input" />
                    </div>

                    <div className="filter-group">
                        <label>End Date</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="form-input" />
                    </div>

                    <div className="filter-actions">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Searching...' : '🔍 Search'}
                        </button>
                    </div>
                </form>Section
            </section>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="logs-table-wrapper glass-card">
                <table className="table audit-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Action</th>
                            <th>User</th>
                            <th>IP Address</th>
                            <th>Resource</th>
                            <th>Status</th>
                            <th>Verification</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log, index) => (
                            <tr key={index} className="fade-in">
                                <td className="timestamp">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="action">
                                    <span className={`action-badge ${log.action.toLowerCase()}`}>
                                        {formatAction(log.action)}
                                    </span>
                                </td>
                                <td>
                                    <div className="user-info">
                                        <span className="username">{log.username}</span>
                                        <span className="role">{log.role}</span>
                                    </div>
                                </td>
                                <td className="ip-cell">{log.ip}</td>
                                <td className="metadata-cell">
                                    {log.metadata.filename || log.metadata.email || '-'}
                                </td>
                                <td className={getStatusColor(log.status)}>{log.status}</td>
                                <td className="hash-status">
                                    <span className="hash-tag" title={log.hash}>✓ Secure Hash</span>
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && !loading && (
                            <tr>
                                <td colSpan="7" className="text-center py-4">No audit logs found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
