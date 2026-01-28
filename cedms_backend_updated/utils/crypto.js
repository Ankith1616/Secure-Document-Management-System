const crypto = require('crypto');

// Constants
const ALGORITHM_AES = 'aes-256-cbc';
const HASH_ALGO = 'sha256';

// 1. Generate RSA Keys (System & User)
const generateRSAKeys = () => {
    return crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
    });
};

// 2. Encryption (Hybrid)
// Encrypt Data with AES
const encryptData = (buffer) => {
    const key = crypto.randomBytes(32); // AES-256 key
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM_AES, key, iv);
    let encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return {
        encryptedData: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        key: key // Returns raw buffer, to be encrypted with RSA
    };
};

// Encrypt AES Key with RSA Public Key
const encryptKey = (aesKeyBuffer, publicKeyPem) => {
    return crypto.publicEncrypt(publicKeyPem, aesKeyBuffer).toString('base64');
};

// 3. Decryption
// Decrypt AES Key with RSA Private Key
const decryptKey = (encryptedKeyBase64, privateKeyPem) => {
    const buffer = Buffer.from(encryptedKeyBase64, 'base64');
    return crypto.privateDecrypt(privateKeyPem, buffer);
};

// Decrypt Data with AES
const decryptData = (encryptedDataBase64, keyBuffer, ivBase64) => {
    const iv = Buffer.from(ivBase64, 'base64');
    const encryptedText = Buffer.from(encryptedDataBase64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM_AES, keyBuffer, iv);
    let decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted;
};

// 4. Hashing & Signature
const generateHash = (buffer) => {
    return crypto.createHash(HASH_ALGO).update(buffer).digest('hex');
};

const signData = (data, privateKeyPem) => {
    const sign = crypto.createSign(HASH_ALGO);
    sign.update(data);
    sign.end();
    return sign.sign(privateKeyPem, 'base64');
};

const verifySignature = (data, signatureBase64, publicKeyPem) => {
    const verify = crypto.createVerify(HASH_ALGO);
    verify.update(data);
    verify.end();
    return verify.verify(publicKeyPem, signatureBase64, 'base64');
};

module.exports = {
    generateRSAKeys,
    encryptData,
    encryptKey,
    decryptKey,
    decryptData,
    generateHash,
    signData,
    verifySignature
};
