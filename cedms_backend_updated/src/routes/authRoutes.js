const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// OTP-enabled Registration Flow
router.post('/register/request-otp', authController.requestRegistrationOTP);
router.post('/register/verify-otp', authController.verifyRegistrationOTP);

// OTP-enabled Login Flow
router.post('/login/request-otp', authController.requestLoginOTP);
router.post('/login/verify-otp', authController.verifyLoginOTP);

// Forgot Password Flow
router.post('/forgot-password/request', authController.requestPasswordResetOTP);
router.post('/forgot-password/verify', authController.verifyPasswordResetOTP);
router.post('/forgot-password/reset', authController.resetPassword);

// Legacy routes (backward compatibility)
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/me', authenticateToken, authController.getCurrentUser);

module.exports = router;
