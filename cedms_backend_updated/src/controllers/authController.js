const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { addUser, findUserByUsername, findUserById, getUsers, updateUser } = require('../utils/db');
const { generateToken } = require('../middleware/auth');
const { generateOTP, storeOTP, verifyOTP } = require('../utils/otp');
const { sendOTPEmail } = require('../utils/email');
const { logEvent } = require('../utils/auditLogger');

/**
 * REGISTRATION FLOW WITH OTP
 */

/**
 * Step 1: Request Registration OTP
 * Validates user data and sends OTP to email
 */
async function requestRegistrationOTP(req, res) {
    try {
        const { username, email, password, fullName, role } = req.body;

        // Validation
        if (!username || !email || !password || !fullName) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Check if user exists
        const existingUser = findUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Validate role
        const validRoles = ['EMPLOYEE', 'MANAGER', 'ADMIN'];
        const userRole = role && validRoles.includes(role) ? role : 'EMPLOYEE';

        // Generate OTP
        const otp = generateOTP();

        // Store user data temporarily with OTP
        const userData = {
            username,
            email,
            password, // Will be hashed after OTP verification
            fullName,
            role: userRole
        };
        storeOTP(email, otp, userData);

        // Send OTP email
        await sendOTPEmail(email, otp, 'registration');

        logEvent('REGISTRATION_REQUEST', req, { email, username, role: userRole });

        res.status(200).json({
            message: 'OTP sent to your email. Please verify to complete registration.',
            email: email
        });
    } catch (error) {
        console.error('Request registration OTP error:', error);
        logEvent('REGISTRATION_REQUEST', req, { email: req.body.email, error: error.message }, 'FAILURE');
        res.status(500).json({ error: 'Failed to send OTP' });
    }
}

/**
 * Step 2: Verify Registration OTP and Create User
 */
async function verifyRegistrationOTP(req, res) {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        // Verify OTP
        const verification = verifyOTP(email, otp);

        if (!verification.valid) {
            logEvent('REGISTRATION_VERIFY', req, { email, error: verification.error }, 'FAILURE');
            return res.status(400).json({ error: verification.error });
        }

        // Get stored user data
        const userData = verification.userData;
        if (!userData) {
            logEvent('REGISTRATION_VERIFY', req, { email, error: 'User data not found' }, 'FAILURE');
            return res.status(400).json({ error: 'Registration data not found. Please start registration again.' });
        }

        // Hash password with bcrypt (salt rounds = 10)
        const passwordHash = await bcrypt.hash(userData.password, 10);

        // Create user
        const newUser = {
            id: uuidv4(),
            username: userData.username,
            email: userData.email,
            passwordHash,
            role: userData.role,
            fullName: userData.fullName,
            createdAt: new Date().toISOString()
        };

        addUser(newUser);

        // Generate JWT token
        const token = generateToken(newUser);

        logEvent('REGISTRATION_COMPLETE', req, { userId: newUser.id, username: newUser.username, role: newUser.role });

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                fullName: newUser.fullName
            },
            token
        });
    } catch (error) {
        console.error('Verify registration OTP error:', error);
        res.status(500).json({ error: 'Registration verification failed' });
    }
}

/**
 * LOGIN FLOW WITH OTP
 */

/**
 * Step 1: Request Login OTP
 * Verifies password and sends OTP
 */
async function requestLoginOTP(req, res) {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user
        const user = findUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            logEvent('LOGIN_REQUEST', req, { username, error: 'Invalid password' }, 'FAILURE');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user has email
        if (!user.email) {
            logEvent('LOGIN_REQUEST', req, { username, error: 'No email found' }, 'FAILURE');
            return res.status(400).json({ error: 'No email associated with this account. Please contact administrator.' });
        }

        // Generate OTP
        const otp = generateOTP();

        // Store user ID with OTP (for verification step)
        storeOTP(user.email, otp, { userId: user.id });

        // Send OTP email
        await sendOTPEmail(user.email, otp, 'login');

        logEvent('LOGIN_REQUEST', req, { userId: user.id, username, email: user.email });

        res.status(200).json({
            message: 'OTP sent to your registered email',
            email: user.email
        });
    } catch (error) {
        console.error('Request login OTP error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
}

/**
 * Step 2: Verify Login OTP and Generate JWT
 */
async function verifyLoginOTP(req, res) {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        // Verify OTP
        const verification = verifyOTP(email, otp);

        if (!verification.valid) {
            logEvent('LOGIN_VERIFY', req, { email, error: verification.error }, 'FAILURE');
            return res.status(400).json({ error: verification.error });
        }

        // Get user ID from stored data
        const userData = verification.userData;
        if (!userData || !userData.userId) {
            logEvent('LOGIN_VERIFY', req, { email, error: 'Session expired' }, 'FAILURE');
            return res.status(400).json({ error: 'Login session expired. Please try again.' });
        }

        // Get user
        const user = findUserById(userData.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate JWT token
        const token = generateToken(user);

        logEvent('LOGIN_COMPLETE', req, { userId: user.id, username: user.username, role: user.role });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                fullName: user.fullName
            },
            token
        });
    } catch (error) {
        console.error('Verify login OTP error:', error);
        res.status(500).json({ error: 'Login verification failed' });
    }
}

/**
 * LEGACY ENDPOINTS (Keep for backward compatibility during transition)
 */

/**
 * User Registration (Legacy - without OTP)
 * @deprecated Use requestRegistrationOTP + verifyRegistrationOTP instead
 */
async function register(req, res) {
    try {
        const { username, password, fullName, role } = req.body;

        // Validation
        if (!username || !password || !fullName) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = findUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Validate role
        const validRoles = ['EMPLOYEE', 'MANAGER', 'ADMIN'];
        const userRole = role && validRoles.includes(role) ? role : 'EMPLOYEE';

        // Hash password with bcrypt (salt rounds = 10)
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const newUser = {
            id: uuidv4(),
            username,
            email: username + '@example.com', // Placeholder email
            passwordHash,
            role: userRole,
            fullName,
            createdAt: new Date().toISOString()
        };

        addUser(newUser);

        // Generate JWT token
        const token = generateToken(newUser);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role,
                fullName: newUser.fullName
            },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
}

/**
 * User Login (Legacy - without OTP)
 * @deprecated Use requestLoginOTP + verifyLoginOTP instead
 */
async function login(req, res) {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user
        const user = findUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = generateToken(user);

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                fullName: user.fullName
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
}

/**
 * Get current user info
 */
/**
 * requestPasswordResetOTP
 */
async function requestPasswordResetOTP(req, res) {
    try {
        const { identifier } = req.body; // username or email
        if (!identifier) {
            return res.status(400).json({ error: 'Username or Email is required' });
        }

        const user = findUserByUsername(identifier);
        // Also check if it's an email
        const users = require('../utils/db').getUsers();
        let targetUser = user || users.find(u => u.email === identifier);

        if (!targetUser) {
            // Security: Don't reveal if user exists, but we can't send OTP if not
            return res.status(404).json({ error: 'User not found' });
        }

        const otp = generateOTP();
        await storeOTP(targetUser.id, otp, 'password_reset');

        await sendOTPEmail(targetUser.email, targetUser.username, otp);

        logEvent('PASSWORD_RESET_REQUEST', req, { email: targetUser.email, username: targetUser.username });
        res.json({ message: 'Password reset OTP sent to your email.', email: targetUser.email });
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Failed to send reset OTP' });
    }
}

/**
 * verifyPasswordResetOTP
 */
async function verifyPasswordResetOTP(req, res) {
    try {
        const { identifier, otp } = req.body;
        if (!identifier || !otp) {
            return res.status(400).json({ error: 'Identifier and OTP are required' });
        }

        const user = findUserByUsername(identifier);
        const users = getUsers();
        let targetUser = user || users.find(u => u.email === identifier);

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const verification = verifyOTP(targetUser.id, otp, true);
        if (!verification.valid) {
            logEvent('PASSWORD_RESET_VERIFY', req, { username: targetUser.username, error: verification.error }, 'FAILURE');
            return res.status(400).json({ error: verification.error });
        }

        logEvent('PASSWORD_RESET_VERIFY', req, { username: targetUser.username });
        res.json({ message: 'OTP verified successfully.' });
    } catch (error) {
        console.error('Verify reset OTP error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
}

/**
 * resetPassword
 */
async function resetPassword(req, res) {
    try {
        const { identifier, otp, newPassword } = req.body;
        if (!identifier || !otp || !newPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const user = findUserByUsername(identifier);
        const users = getUsers();
        let targetUser = user || users.find(u => u.email === identifier);

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const verification = verifyOTP(targetUser.id, otp, false);
        if (!verification.valid) {
            logEvent('PASSWORD_RESET_VERIFY', req, { username: targetUser.username, error: verification.error }, 'FAILURE');
            return res.status(400).json({ error: verification.error });
        }

        // Update password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        targetUser.passwordHash = passwordHash;
        updateUser(targetUser.id, targetUser);

        logEvent('PASSWORD_RESET_SUCCESS', req, { username: targetUser.username });
        res.json({ message: 'Password has been reset successfully. You can now login.' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
}

function getCurrentUser(req, res) {
    res.json({
        user: {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role
        }
    });
}

module.exports = {
    // OTP-enabled endpoints
    requestRegistrationOTP,
    verifyRegistrationOTP,
    requestLoginOTP,
    verifyLoginOTP,
    requestPasswordResetOTP,
    verifyPasswordResetOTP,
    resetPassword,
    // Legacy endpoints
    register,
    login,
    getCurrentUser
};
