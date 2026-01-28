import { useState } from 'react';
import { documentsAPI } from '../services/api';
import './UploadModal.css';

export default function UploadModal({ onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            setError('Please select a file');
            return;
        }

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            await documentsAPI.upload(formData);
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Upload Document</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                {error && (
                    <div className="alert alert-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="upload-area">
                        <input
                            type="file"
                            id="file-input"
                            onChange={handleFileChange}
                            className="file-input"
                        />
                        <label htmlFor="file-input" className="file-label">
                            <div className="upload-icon">📁</div>
                            <div className="upload-text">
                                {file ? (
                                    <>
                                        <strong>{file.name}</strong>
                                        <span>Click to change file</span>
                                    </>
                                ) : (
                                    <>
                                        <strong>Choose a file</strong>
                                        <span>or drag and drop here</span>
                                    </>
                                )}
                            </div>
                        </label>
                    </div>

                    <div className="security-info">
                        <div className="info-item">
                            <span className="info-icon">🔐</span>
                            <span>File will be encrypted with AES-256</span>
                        </div>
                        <div className="info-item">
                            <span className="info-icon">🔑</span>
                            <span>Stored securely on server</span>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={uploading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!file || uploading}
                        >
                            {uploading ? 'Uploading...' : 'Upload & Encrypt'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
