const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Create email transporter
 * Uses environment variables for configuration
 */
function createTransport() {
    // For development/testing, you can use:
    // 1. Gmail with App Password
    // 2. Ethereal (fake SMTP for testing)
    // 3. Any other SMTP service

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    return transporter;
}

/**
 * Send OTP email
 * @param {string} email - Recipient email
 * @param {string} otp - OTP to send
 * @param {string} purpose - 'registration' or 'login'
 * @returns {Promise<boolean>} Success status
 */
async function sendOTPEmail(email, otp, purpose = 'login') {
    try {
        // If email credentials not configured, just log OTP to console
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('\n' + '='.repeat(60));
            console.log('📧 EMAIL NOT CONFIGURED - OTP DISPLAYED IN TERMINAL');
            console.log('='.repeat(60));
            console.log(`To: ${email}`);
            console.log(`Purpose: ${purpose.toUpperCase()}`);
            console.log(`OTP: ${otp}`);
            console.log(`Valid for: 5 minutes`);
            console.log('='.repeat(60) + '\n');
            return true;
        }

        const transporter = createTransport();

        const subject = purpose === 'registration'
            ? 'CEDMS - Verify Your Registration'
            : 'CEDMS - Login Verification Code';

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .otp-box { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
                    .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔒 CEDMS Security</h1>
                        <p>${purpose === 'registration' ? 'Complete Your Registration' : 'Login Verification'}</p>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>Your One-Time Password (OTP) for ${purpose} is:</p>
                        
                        <div class="otp-box">
                            <div class="otp-code">${otp}</div>
                        </div>

                        <div class="warning">
                            ⏰ <strong>This OTP will expire in 5 minutes.</strong>
                        </div>

                        <p><strong>Security Tips:</strong></p>
                        <ul>
                            <li>Never share this OTP with anyone</li>
                            <li>CEDMS staff will never ask for your OTP</li>
                            <li>If you didn't request this, please ignore this email</li>
                        </ul>

                        <div class="footer">
                            <p>This is an automated email from CEDMS - Confidential Electronic Document Management System</p>
                            <p>Secured with AES-256 Encryption | RSA-2048 Digital Signatures | Multi-Factor Authentication</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: `"CEDMS Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: html
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP email sent to ${email}`);
        return true;

    } catch (error) {
        console.error('❌ Email sending failed:', error.message);

        // Fallback: Display OTP in console if email fails
        console.log('\n' + '='.repeat(60));
        console.log('⚠️  EMAIL FAILED - OTP DISPLAYED IN TERMINAL');
        console.log('='.repeat(60));
        console.log(`To: ${email}`);
        console.log(`OTP: ${otp}`);
        console.log(`Valid for: 5 minutes`);
        console.log('='.repeat(60) + '\n');

        return true; // Still return true so OTP can be used
    }
}

/**
 * Test email configuration
 */
async function testEmailConfig() {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('⚠️  Email not configured. OTPs will be displayed in terminal.');
            return false;
        }

        const transporter = createTransport();
        await transporter.verify();
        console.log('✅ Email configuration is valid');
        return true;
    } catch (error) {
        console.error('❌ Email configuration error:', error.message);
        console.log('⚠️  OTPs will be displayed in terminal instead.');
        return false;
    }
}

module.exports = {
    sendOTPEmail,
    testEmailConfig
};
