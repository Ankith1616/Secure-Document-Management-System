const express = require('express');
const router = express.Router();
const multer = require('multer');
const authController = require('../controllers/authController');
const documentController = require('../controllers/documentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const upload = multer({ dest: 'temp_uploads/' });

// Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/verify-otp', authController.verifyOTP);

// Document Routes
router.post('/documents/upload',
    authenticate,
    authorize('documents', 'create'),
    upload.single('file'),
    documentController.uploadDocument
);

router.get('/documents',
    authenticate,
    authorize('documents', 'read'),
    documentController.getAllDocuments
);

router.get('/documents/:id/download',
    authenticate,
    authorize('documents', 'download'),
    documentController.downloadDocument
);

router.get('/documents/:id/verify',
    authenticate,
    authorize('documents', 'read'),
    documentController.verifyDocument
);

module.exports = router;
