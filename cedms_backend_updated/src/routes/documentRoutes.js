const express = require('express');
const router = express.Router();
const multer = require('multer');

const documentController = require('../controllers/documentController');
const { authenticateToken } = require('../middleware/auth');
const { isManagerOrAdmin } = require('../middleware/rbac');

// Configure multer for memory storage (we'll encrypt before saving)
const upload = multer({ storage: multer.memoryStorage() });

// All document routes require authentication
router.use(authenticateToken);

// Upload document (all authenticated users)
router.post('/upload', upload.single('file'), documentController.uploadDocument);

// Get documents (filtered by role)
router.get('/', documentController.getDocumentsList);

// Get deleted history (Manager/Admin only)
router.get('/deleted-history', isManagerOrAdmin, documentController.getDeletedHistory);

// Update document status (Manager/Admin only)
router.patch('/:id/status', isManagerOrAdmin, documentController.updateDocumentStatus);

// Download document (approved only)
router.get('/:id/download', documentController.downloadDocument);

// Delete document (Manager/Admin only)
router.delete('/:id', isManagerOrAdmin, documentController.deleteDocument);

module.exports = router;
