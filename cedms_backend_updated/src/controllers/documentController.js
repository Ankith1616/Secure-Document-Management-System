const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const {
    encryptFile,
    decryptFile,
    generateHash,
    signData,
    verifySignature,
    encodeBase64,
    decodeBase64
} = require('../utils/crypto');
const {
    addDocument,
    getDocuments,
    findDocumentById,
    updateDocument,
    removeDocument,
    findUserById
} = require('../utils/db');
const { logEvent } = require('../utils/auditLogger');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Upload Document (Encrypted)
 */
async function uploadDocument(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileBuffer = req.file.buffer;
        const originalFilename = req.file.originalname;

        // Encrypt file
        const encryptedBuffer = encryptFile(fileBuffer);

        // Generate unique storage filename
        const storageFilename = `${uuidv4()}.enc`;
        const storagePath = path.join(UPLOADS_DIR, storageFilename);

        // Save encrypted file
        fs.writeFileSync(storagePath, encryptedBuffer);

        // Create document metadata
        const docId = uuidv4();
        const document = {
            id: docId,
            filename: originalFilename,
            storagePath: storageFilename,
            uploaderId: req.user.id,
            uploaderName: req.user.username,
            uploadedAt: new Date().toISOString(),
            status: 'PENDING',
            approverId: null,
            approvalData: null
        };

        addDocument(document);
        logEvent('DOCUMENT_UPLOAD', req, { docId, filename: originalFilename });

        res.status(201).json({
            message: 'Document uploaded and encrypted successfully',
            document: {
                id: encodeBase64(docId), // Base64 encode ID
                filename: originalFilename,
                status: 'PENDING',
                uploadedAt: document.uploadedAt
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
}

/**
 * Get Documents (Filtered by Role)
 */
function getDocumentsList(req, res) {
    try {
        const { status, employeeId, startDate, endDate } = req.query;
        let documents = getDocuments();

        // RBAC: Employees see only their own documents
        if (req.user.role === 'EMPLOYEE') {
            documents = documents.filter(doc => doc.uploaderId === req.user.id);
        }

        // Apply filters
        if (status) {
            documents = documents.filter(doc => doc.status === status.toUpperCase());
        }

        if (employeeId && (req.user.role === 'MANAGER' || req.user.role === 'ADMIN')) {
            const searchStr = employeeId.toLowerCase();
            documents = documents.filter(doc =>
                doc.uploaderId.toLowerCase().includes(searchStr) ||
                doc.uploaderName.toLowerCase().includes(searchStr)
            );
        }
        if (startDate) {
            documents = documents.filter(doc => new Date(doc.uploadedAt) >= new Date(startDate));
        }

        if (endDate) {
            documents = documents.filter(doc => new Date(doc.uploadedAt) <= new Date(endDate));
        }

        // Encode IDs and prepare response
        const response = documents.map(doc => ({
            id: encodeBase64(doc.id),
            filename: doc.filename,
            uploaderId: doc.uploaderId,
            uploaderName: doc.uploaderName,
            uploadedAt: doc.uploadedAt,
            status: doc.status,
            approverId: doc.approverId,
            approverName: doc.approverName || null,
            isSigned: !!doc.approvalData,
            approvedAt: doc.approvalData?.signedAt || null,
            signature: doc.approvalData?.signature || null,
            metadataHash: doc.approvalData?.metadataHash || null,
            storagePath: doc.storagePath,
            encryptionAlgorithm: 'AES-256-CBC'
        }));

        res.json({ documents: response });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ error: 'Failed to retrieve documents' });
    }
}

/**
 * Approve/Reject Document (Manager/Admin only)
 */
async function updateDocumentStatus(req, res) {
    try {
        const encodedId = req.params.id;
        const { status } = req.body;

        // Decode Base64 ID
        const docId = decodeBase64(encodedId);

        // Validate status
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use APPROVED or REJECTED' });
        }

        const document = findDocumentById(docId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Prepare approval data
        let approvalData = null;
        if (status === 'APPROVED') {
            // Generate metadata hash
            const approvalTimestamp = new Date().toISOString();

            const metadataString = JSON.stringify({
                docId: document.id,
                filename: document.filename,
                uploaderId: document.uploaderId,
                approverId: req.user.id,
                timestamp: approvalTimestamp
            });
            const metadataHash = generateHash(metadataString);

            // Generate digital signature
            const signature = signData(metadataHash);

            approvalData = {
                signedAt: approvalTimestamp,
                signature,
                metadataHash
            };
        }

        // Update document
        const updatedDoc = updateDocument(docId, {
            status,
            approverId: req.user.id,
            approverName: req.user.username,
            approvalData
        });

        logEvent('DOCUMENT_STATUS_UPDATE', req, {
            docId,
            filename: document.filename,
            newStatus: status,
            isSigned: !!approvalData
        });

        res.json({
            message: `Document ${status.toLowerCase()} successfully`,
            document: {
                id: encodeBase64(updatedDoc.id),
                filename: updatedDoc.filename,
                status: updatedDoc.status,
                isSigned: !!updatedDoc.approvalData,
                approvedAt: updatedDoc.approvalData?.signedAt || null
            }
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update document status' });
    }
}

/**
 * Download Document (Decrypted, Approved only)
 */
function downloadDocument(req, res) {
    try {
        console.log('Download request received:', { encodedId: req.params.id, user: req.user.username, role: req.user.role });

        const encodedId = req.params.id;
        const docId = decodeBase64(encodedId);
        console.log('Decoded document ID:', docId);

        const document = findDocumentById(docId);
        if (!document) {
            console.log('Document not found:', docId);
            return res.status(404).json({ error: 'Document not found' });
        }
        console.log('Document found:', { id: document.id, filename: document.filename, status: document.status });

        // RBAC: Employees can only download their own documents
        if (req.user.role === 'EMPLOYEE' && document.uploaderId !== req.user.id) {
            logEvent('DOCUMENT_DOWNLOAD', req, { docId, filename: document.filename, error: 'Access Denied' }, 'FAILURE');
            return res.status(403).json({ error: 'Access denied' });
        }

        // Only approved documents can be downloaded
        if (document.status !== 'APPROVED') {
            logEvent('DOCUMENT_DOWNLOAD', req, { docId, filename: document.filename, error: 'Not approved' }, 'FAILURE');
            return res.status(403).json({
                error: 'Document must be approved before download',
                status: document.status
            });
        }

        // Verify digital signature
        if (document.approvalData) {
            const metadataString = JSON.stringify({
                docId: document.id,
                filename: document.filename,
                uploaderId: document.uploaderId,
                approverId: document.approverId,
                timestamp: document.approvalData.signedAt
            });
            const metadataHash = generateHash(metadataString);

            const isValid = verifySignature(metadataHash, document.approvalData.signature);
            if (!isValid) {
                logEvent('DOCUMENT_DOWNLOAD', req, { docId, filename: document.filename, error: 'Signature failure' }, 'FAILURE');
                return res.status(500).json({ error: 'Digital signature verification failed' });
            }
        }

        // Read and decrypt file
        const storagePath = path.join(UPLOADS_DIR, document.storagePath);
        if (!fs.existsSync(storagePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        const encryptedBuffer = fs.readFileSync(storagePath);
        const decryptedBuffer = decryptFile(encryptedBuffer);

        logEvent('DOCUMENT_DOWNLOAD', req, { docId, filename: document.filename });

        // Send file
        res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('X-Document-Verified', 'true');
        res.send(decryptedBuffer);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed: ' + error.message });
    }
}

/**
 * Delete Document (Manager/Admin only)
 */
async function deleteDocument(req, res) {
    try {
        const encodedId = req.params.id;
        const docId = decodeBase64(encodedId);

        const document = findDocumentById(docId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // RBAC: Only Manager/Admin can delete
        if (req.user.role !== 'MANAGER' && req.user.role !== 'ADMIN') {
            logEvent('DOCUMENT_DELETE', req, { docId, filename: document.filename, error: 'Access Denied' }, 'FAILURE');
            return res.status(403).json({ error: 'Access denied: Manager/Admin only' });
        }

        // 1. Delete encrypted file from disk
        const storagePath = path.join(UPLOADS_DIR, document.storagePath);
        if (fs.existsSync(storagePath)) {
            fs.unlinkSync(storagePath);
        }

        // 2. Remove document metadata from DB
        const removed = removeDocument(docId);
        if (!removed) {
            logEvent('DOCUMENT_DELETE', req, { docId, filename: document.filename, error: 'DB failure' }, 'FAILURE');
            return res.status(500).json({ error: 'Failed to remove document record' });
        }

        logEvent('DOCUMENT_DELETE', req, { docId, filename: document.filename });
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
}

/**
 * Get Deleted Documents History (Manager/Admin only)
 */
function getDeletedHistory(req, res) {
    try {
        const { AUDIT_FILE } = require('../utils/db');
        if (!fs.existsSync(AUDIT_FILE)) {
            return res.json({ history: [] });
        }

        const logs = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));

        // Filter for deletion events
        const deletionHistory = logs
            .filter(log => log.action === 'DOCUMENT_DELETE' && log.status === 'SUCCESS')
            .map(log => ({
                timestamp: log.timestamp,
                filename: log.metadata.filename,
                docId: log.metadata.docId,
                deletedBy: log.username,
                role: log.role,
                ip: log.ip
            }));

        // Most recent first
        deletionHistory.reverse();

        res.json({ history: deletionHistory });
    } catch (error) {
        console.error('Get deleted history error:', error);
        res.status(500).json({ error: 'Failed to retrieve deleted history' });
    }
}

module.exports = {
    uploadDocument,
    getDocumentsList,
    updateDocumentStatus,
    downloadDocument,
    deleteDocument,
    getDeletedHistory
};
