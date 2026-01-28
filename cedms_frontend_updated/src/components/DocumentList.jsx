import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import SignatureModal from './SignatureModal';
import EncryptionModal from './EncryptionModal';
import './DocumentList.css';

export default function DocumentList({ documents, onStatusUpdate, onDownload, onDelete }) {
    const { user, isManagerOrAdmin } = useAuth();
    const [selectedSignature, setSelectedSignature] = useState(null);
    const [selectedEncryption, setSelectedEncryption] = useState(null);

    if (documents.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">📄</div>
                <h3>No documents found</h3>
                <p>Upload your first document to get started</p>
            </div>
        );
    }

    return (
        <div className="document-list-container">
            <div className="table-wrapper">
                <table className="table document-table">
                    <thead>
                        <tr>
                            <th>Filename</th>
                            <th>Uploaded By</th>
                            <th>Date</th>
                            <th>Status</th>
                            {isManagerOrAdmin() && <th>Approver</th>}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {documents.map((doc) => (
                            <tr key={doc.id} className="fade-in">
                                <td>
                                    <div className="file-info">
                                        <span className="file-icon">📎</span>
                                        <span className="file-name">{doc.filename}</span>

                                        {/* Encryption Badge - Always visible */}
                                        <span
                                            className="encryption-badge clickable"
                                            title="AES-256 Encrypted. Click for details."
                                            onClick={() => setSelectedEncryption({
                                                algorithm: doc.encryptionAlgorithm,
                                                storagePath: doc.storagePath
                                            })}
                                        >
                                            🔒 Encrypted
                                        </span>

                                        {doc.isSigned && (
                                            <span
                                                className="verified-badge clickable"
                                                title="Click to view digital signature details"
                                                onClick={() => setSelectedSignature({
                                                    filename: doc.filename,
                                                    approverName: doc.approverName,
                                                    approvedAt: doc.approvedAt,
                                                    signature: doc.signature,
                                                    metadataHash: doc.metadataHash
                                                })}
                                            >
                                                ✓ Digitally Signed & Verified
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td>{doc.uploaderName}</td>
                                <td>{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                                <td>
                                    <span className={`badge badge-${doc.status.toLowerCase()}`}>
                                        {doc.status}
                                    </span>
                                </td>
                                {isManagerOrAdmin() && (
                                    <td>{doc.approverName || '-'}</td>
                                )}
                                <td>
                                    <div className="action-buttons">
                                        {/* Download button - only for approved docs */}
                                        {doc.status === 'APPROVED' && (
                                            <button
                                                className="btn btn-sm btn-success"
                                                onClick={() => onDownload(doc.id, doc.filename)}
                                                title="Download (Decrypted)"
                                            >
                                                ⬇️ Download
                                            </button>
                                        )}

                                        {/* Approve/Reject buttons - Manager/Admin only, pending docs */}
                                        {isManagerOrAdmin() && doc.status === 'PENDING' && (
                                            <>
                                                <button
                                                    className="btn btn-sm btn-success"
                                                    onClick={() => onStatusUpdate(doc.id, 'APPROVED')}
                                                    title="Approve & Sign"
                                                >
                                                    ✓ Approve
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => onStatusUpdate(doc.id, 'REJECTED')}
                                                >
                                                    ✗ Reject
                                                </button>
                                            </>
                                        )}

                                        {/* Info for non-approved docs */}
                                        {doc.status === 'PENDING' && !isManagerOrAdmin() && (
                                            <span className="status-text">Awaiting approval</span>
                                        )}
                                        {doc.status === 'REJECTED' && (
                                            <span className="status-text text-danger">Rejected</span>
                                        )}

                                        {/* Delete button - Manager/Admin only */}
                                        {isManagerOrAdmin() && (
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => {
                                                    if (window.confirm(`Are you sure you want to delete "${doc.filename}"?`)) {
                                                        onDelete(doc.id);
                                                    }
                                                }}
                                                title="Delete Document"
                                            >
                                                🗑️ Delete
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedSignature && (
                <SignatureModal
                    signature={selectedSignature}
                    onClose={() => setSelectedSignature(null)}
                />
            )}

            {selectedEncryption && (
                <EncryptionModal
                    encryption={selectedEncryption}
                    onClose={() => setSelectedEncryption(null)}
                />
            )}
        </div>
    );
}
