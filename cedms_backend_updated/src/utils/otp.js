const crypto = require('crypto');

// In-memory OTP storage (for development - could be moved to JSON file)
const otpStore = new Map();

// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;

/**
 * Generate a cryptographically secure 6-digit OTP
 * @returns {string} 6-digit OTP
 */
function generateOTP() {
    // Generate random number between 100000 and 999999
    const otp = crypto.randomInt(100000, 1000000).toString();
    console.log('🔐 Generated OTP:', otp); // For terminal display during development
    return otp;
}

/**
 * Hash OTP using SHA-256
 * @param {string} otp - Plain OTP to hash
 * @returns {string} Hashed OTP (hex)
 */
function hashOTP(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Store OTP with expiry and attempt tracking
 * @param {string} email - User's email
 * @param {string} otp - Plain OTP (will be hashed)
 * @param {object} userData - Optional user data to store temporarily
 */
function storeOTP(email, otp, userData = null) {
    const otpHash = hashOTP(otp);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    otpStore.set(email, {
        otpHash,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
        maxAttempts: MAX_ATTEMPTS,
        userData // Store registration data temporarily
    });

    console.log(`✅ OTP stored for ${email}, expires at ${expiresAt.toLocaleTimeString()}`);
}

/**
 * Verify OTP
 * @param {string} email - User's email
 * @param {string} otp - OTP to verify
 * @param {boolean} persist - If true, OTP is not deleted on success
 * @returns {object} { valid: boolean, error: string, userData: object }
 */
function verifyOTP(email, otp, persist = false) {
    const stored = otpStore.get(email);

    if (!stored) {
        return { valid: false, error: 'No OTP found. Please request a new one.' };
    }

    // Check expiry
    const now = new Date();
    const expiresAt = new Date(stored.expiresAt);
    if (now > expiresAt) {
        otpStore.delete(email);
        return { valid: false, error: 'OTP has expired. Please request a new one.' };
    }

    // Check attempts
    if (stored.attempts >= stored.maxAttempts) {
        otpStore.delete(email);
        return { valid: false, error: 'Too many failed attempts. Please request a new OTP.' };
    }

    // Verify OTP hash
    const otpHash = hashOTP(otp);
    if (otpHash !== stored.otpHash) {
        // Increment attempts
        stored.attempts += 1;
        otpStore.set(email, stored);

        const remainingAttempts = stored.maxAttempts - stored.attempts;
        return {
            valid: false,
            error: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
        };
    }

    // OTP is valid
    const userData = stored.userData;

    if (!persist) {
        otpStore.delete(email);
    }

    console.log(`✅ OTP verified successfully for ${email} (persist: ${persist})`);

    return { valid: true, userData };
}

/**
 * Clear OTP for an email
 * @param {string} email - User's email
 */
function clearOTP(email) {
    otpStore.delete(email);
    console.log(`🗑️  OTP cleared for ${email}`);
}

/**
 * Get remaining time for OTP
 * @param {string} email - User's email
 * @returns {number} Remaining seconds, or 0 if expired/not found
 */
function getRemainingTime(email) {
    const stored = otpStore.get(email);
    if (!stored) return 0;

    const now = new Date();
    const expiresAt = new Date(stored.expiresAt);
    const remainingMs = expiresAt - now;

    return remainingMs > 0 ? Math.floor(remainingMs / 1000) : 0;
}

module.exports = {
    generateOTP,
    hashOTP,
    storeOTP,
    verifyOTP,
    clearOTP,
    getRemainingTime,
    OTP_EXPIRY_MINUTES
};
