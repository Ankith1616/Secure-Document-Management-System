const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Encryption Configuration
const ALGORITHM = 'aes-256-cbc';
const KEY_PATH = path.join(__dirname, '../../data/keys/server.key');
const IV_LENGTH = 16;

/**
 * Initialize or load encryption key
 */
function initEncryptionKey() {
    const keyDir = path.dirname(KEY_PATH);
    if (!fs.existsSync(keyDir)) {
        fs.mkdirSync(keyDir, { recursive: true });
    }

    if (!fs.existsSync(KEY_PATH)) {
        const key = crypto.randomBytes(32); // 256 bits
        fs.writeFileSync(KEY_PATH, key.toString('hex'));
        console.log('✓ New AES-256 encryption key generated');
        return key;
    }

    return Buffer.from(fs.readFileSync(KEY_PATH, 'utf8'), 'hex');
}

/**
 * Encrypt file buffer
 * @param {Buffer} buffer - File buffer to encrypt
 * @returns {Buffer} - Encrypted buffer
 */
function encryptFile(buffer) {
    const key = initEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    
    // Prepend IV to encrypted data for decryption
    return Buffer.concat([iv, encrypted]);
}

/**
 * Decrypt file buffer
 * @param {Buffer} encryptedBuffer - Encrypted buffer
 * @returns {Buffer} - Decrypted buffer
 */
function decryptFile(encryptedBuffer) {
    const key = initEncryptionKey();
    
    // Extract IV from the beginning
    const iv = encryptedBuffer.slice(0, IV_LENGTH);
    const encrypted = encryptedBuffer.slice(IV_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Generate SHA-256 hash of data
 * @param {string} data - Data to hash
 * @returns {string} - Hex hash
 */
function generateHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Initialize RSA key pair for digital signatures
 */
function initRSAKeys() {
    const keysDir = path.join(__dirname, '../../data/keys');
    const privateKeyPath = path.join(keysDir, 'private.pem');
    const publicKeyPath = path.join(keysDir, 'public.pem');

    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
    }

    if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        fs.writeFileSync(privateKeyPath, privateKey);
        fs.writeFileSync(publicKeyPath, publicKey);
        console.log('✓ RSA-2048 key pair generated for digital signatures');
    }

    return {
        privateKey: fs.readFileSync(privateKeyPath, 'utf8'),
        publicKey: fs.readFileSync(publicKeyPath, 'utf8')
    };
}

/**
 * Sign data using RSA private key
 * @param {string} data - Data to sign
 * @returns {string} - Base64 signature
 */
function signData(data) {
    const { privateKey } = initRSAKeys();
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'base64');
}

/**
 * Verify signature using RSA public key
 * @param {string} data - Original data
 * @param {string} signature - Base64 signature
 * @returns {boolean} - Verification result
 */
function verifySignature(data, signature) {
    const { publicKey } = initRSAKeys();
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
}

/**
 * Encode string to Base64
 */
function encodeBase64(str) {
    return Buffer.from(str).toString('base64');
}

/**
 * Decode Base64 to string
 */
function decodeBase64(str) {
    return Buffer.from(str, 'base64').toString('utf8');
}

module.exports = {
    encryptFile,
    decryptFile,
    generateHash,
    signData,
    verifySignature,
    encodeBase64,
    decodeBase64,
    initEncryptionKey,
    initRSAKeys
};
