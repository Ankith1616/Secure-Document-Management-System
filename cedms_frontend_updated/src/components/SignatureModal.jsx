import "./SignatureModal.css";

export default function SignatureModal({ signature, onClose }) {
    if (!signature) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-card fade-in">
                <div className="modal-header">
                    <h2>🔏 Digital Signature Details</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body signature-details">
                    <div className="signature-status">
                        <div className="status-icon">✓</div>
                        <h3>Signature Verified</h3>
                        <p>This document is cryptographically signed and the integrity is verified.</p>
                    </div>

                    <div className="detail-item">
                        <label>Document Name</label>
                        <div className="detail-value">{signature.filename || 'Signed Document'}</div>
                    </div>

                    <div className="detail-item">
                        <label>Approved By</label>
                        <div className="detail-value">{signature.approverName}</div>
                    </div>

                    <div className="detail-item">
                        <label>Signed Date</label>
                        <div className="detail-value">{new Date(signature.approvedAt).toLocaleString()}</div>
                    </div>

                    <div className="detail-item">
                        <label>SHA-256 Hash (Integrity)</label>
                        <div className="detail-value hash-text">{signature.metadataHash}</div>
                    </div>

                    <div className="detail-item">
                        <label>RSA Digital Signature</label>
                        <div className="detail-value signature-text">{signature.signature}</div>
                    </div>

                    <div className="security-note">
                        🛡️ This signature proves non-repudiation and ensures the document has not been tampered with since approval.
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
