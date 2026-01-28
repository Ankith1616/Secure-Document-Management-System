require('dotenv').config(); // Load environment variables

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const auditRoutes = require('./routes/auditRoutes');
const { initDataFiles } = require('./utils/db');
const { initEncryptionKey, initRSAKeys } = require('./utils/crypto');
const { testEmailConfig } = require('./utils/email');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Initialize data files and crypto keys
initDataFiles();
initEncryptionKey();
initRSAKeys();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit-logs', auditRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({
        message: 'CEDMS Secure Backend Running',
        security: {
            encryption: 'AES-256-CBC',
            signature: 'RSA-SHA256',
            hashing: 'SHA-256',
            authentication: 'JWT',
            authorization: 'RBAC',
            encoding: 'Base64',
            mfa: 'Email-based OTP'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, async () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔒 CEDMS Secure Backend Server`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🔐 Security Features Active:`);
    console.log(`   ✓ AES-256-CBC Encryption`);
    console.log(`   ✓ RSA-2048 Digital Signatures`);
    console.log(`   ✓ SHA-256 Hashing`);
    console.log(`   ✓ JWT Authentication`);
    console.log(`   ✓ Role-Based Access Control (RBAC)`);
    console.log(`   ✓ Base64 Encoding`);
    console.log(`   ✓ bcrypt Password Hashing`);
    console.log(`   ✓ Email-based OTP/MFA`);

    // Test email configuration
    console.log(`\n📧 Email Configuration:`);
    await testEmailConfig();

    console.log(`${'='.repeat(60)}\n`);
});

module.exports = app;
