import './EncryptionModal.css';

export default function EncryptionModal({ encryption, onClose }) {
    if (!encryption) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content encryption-modal" onClick={e => e.stopPropagation()}>
                <div className="encryption-header">
                    <div className="encryption-icon">🔒</div>
                    <h2>AES-256 Encryption Details</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="encryption-body">
                    <div className="encryption-status secure">
                        <span className="status-icon">🛡️</span>
                        <div>
                            <h3>Encrypted At Rest</h3>
                            <p>This document is protected with AES-256-CBC military-grade encryption.</p>
                        </div>
                    </div>

                    <div className="crypto-details">
                        <div className="crypto-item">
                            <label>Algorithm</label>
                            <div className="crypto-value">{encryption.algorithm}</div>
                        </div>
                        <div className="crypto-item">
                            <label>Key Length</label>
                            <div className="crypto-value">256 Bits</div>
                        </div>
                        <div className="crypto-item">
                            <label>Mode</label>
                            <div className="crypto-value">CBC (Cipher Block Chaining)</div>
                        </div>
                        <div className="crypto-group">
                            <label>Secure Storage Path (Encrypted File)</label>
                            <div className="crypto-code">{encryption.storagePath}</div>
                            <span className="code-description">The file is stored on the server with a unique UUID and `.enc` extension.</span>
                        </div>
                        <div className="crypto-info-box">
                            <p><strong>Note:</strong> The encryption key is stored securely in the system's key vault and is never exposed to the client side. Decryption only occurs in memory during authorized downloads.</p>
                        </div>
                    </div>
                </div>

                <div className="encryption-footer">
                    <button className="btn btn-primary" onClick={onClose}>Understood</button>
                    <div className="secure-badge">AES-SECURE</div>
                </div>
            </div>
        </div>
    );
}
