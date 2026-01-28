const fs = require('fs');
const crypto = require('crypto');
const { AUDIT_FILE } = require('./db');

/**
 * Generate hash of log entry
 */
function generateLogHash(entry, previousHash) {
    const data = JSON.stringify(entry) + previousHash;
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Log a system event
 * @param {string} action - Action performed (e.g., 'LOGIN', 'UPLOAD')
 * @param {object} req - Express request object for IP and user context
 * @param {object} metadata - Additional info (e.g., docId, status)
 * @param {string} status - 'SUCCESS' or 'FAILURE'
 */
function logEvent(action, req, metadata = {}, status = 'SUCCESS') {
    try {
        const logs = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
        const previousHash = logs.length > 0 ? logs[logs.length - 1].hash : '0';

        const entry = {
            timestamp: new Date().toISOString(),
            action,
            userId: req.user?.id || metadata.userId || 'SYSTEM',
            username: req.user?.username || metadata.username || 'SYSTEM',
            role: req.user?.role || metadata.role || 'GUEST',
            ip: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            metadata: {
                ...metadata,
                userAgent: req.headers?.['user-agent']
            },
            status
        };

        // Add hash for tamper evidence
        entry.hash = generateLogHash(entry, previousHash);

        logs.push(entry);
        fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2));

        console.log(`📝 Audit Log: ${action} by ${entry.username} - ${status}`);
    } catch (error) {
        console.error('❌ Failed to write audit log:', error);
    }
}

/**
 * Verify integrity of audit logs
 * @returns {object} { isValid: boolean, tamperedIndex: number }
 */
function verifyLogIntegrity() {
    try {
        const logs = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
        let previousHash = '0';

        for (let i = 0; i < logs.length; i++) {
            const entry = { ...logs[i] };
            const storedHash = entry.hash;
            delete entry.hash; // Remove hash before recalculating

            const computedHash = generateLogHash(entry, previousHash);
            if (computedHash !== storedHash) {
                return { isValid: false, tamperedIndex: i };
            }
            previousHash = storedHash;
        }

        return { isValid: true };
    } catch (error) {
        console.error('❌ Failed to verify audit logs:', error);
        return { isValid: false, error: error.message };
    }
}

module.exports = {
    logEvent,
    verifyLogIntegrity
};
