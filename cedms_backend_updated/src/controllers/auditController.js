const fs = require('fs');
const { AUDIT_FILE } = require('../utils/db');
const { verifyLogIntegrity } = require('../utils/auditLogger');

/**
 * Get Audit Logs (Admin only)
 */
function getLogs(req, res) {
    try {
        const { action, userId, status, startDate, endDate } = req.query;

        let logs = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));

        // Apply filters
        if (action) {
            logs = logs.filter(log => log.action === action.toUpperCase());
        }

        if (userId) {
            logs = logs.filter(log => log.userId === userId);
        }

        if (status) {
            logs = logs.filter(log => log.status === status.toUpperCase());
        }

        if (startDate) {
            logs = logs.filter(log => new Date(log.timestamp) >= new Date(startDate));
        }

        if (endDate) {
            logs = logs.filter(log => new Date(log.timestamp) <= new Date(endDate));
        }

        // Return most recent logs first
        logs.reverse();

        // Verify integrity
        const integrity = verifyLogIntegrity();

        res.json({
            logs,
            integrity: {
                isValid: integrity.isValid,
                message: integrity.isValid
                    ? 'Logs verified: No tampering detected'
                    : `⚠️ TAMPER ALERT: Log at index ${integrity.tamperedIndex} has been modified!`
            }
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Failed to retrieve audit logs' });
    }
}

/**
 * Clear Audit Logs (Admin only)
 */
function clearLogs(req, res) {
    try {
        const { logEvent } = require('../utils/auditLogger');

        // Empty the logs file
        fs.writeFileSync(AUDIT_FILE, JSON.stringify([], null, 2));

        // Log the clear action itself as the first entry
        logEvent('AUDIT_LOGS_CLEARED', req, { reason: 'Admin requested clear' });

        res.json({ message: 'Audit logs cleared successfully' });
    } catch (error) {
        console.error('Clear audit logs error:', error);
        res.status(500).json({ error: 'Failed to clear audit logs' });
    }
}

module.exports = {
    getLogs,
    clearLogs
};
