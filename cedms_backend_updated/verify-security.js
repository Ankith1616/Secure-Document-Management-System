/**
 * CEDMS Security Verification Script
 * This script demonstrates the core cryptographic operations used in the system.
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const {
    encryptFile,
    decryptFile,
    signData,
    verifySignature,
    generateHash
} = require('./src/utils/crypto');

async function runVerification() {
    console.log('\n' + '='.repeat(60));
    console.log('🛡️  CEDMS SECURITY ARCHITECTURE VERIFICATION');
    console.log('='.repeat(60) + '\n');

    // 1. Password Hashing (bcrypt with Salt)
    console.log('--- 1. PASSWORD HASHING (bcrypt) ---');
    const plainPassword = 'SecurePassword123!';
    const saltRounds = 10;
    const hash1 = await bcrypt.hash(plainPassword, saltRounds);
    const hash2 = await bcrypt.hash(plainPassword, saltRounds);

    console.log('Plain Password:  ', plainPassword);
    console.log('Hash 1 (Salted): ', hash1);
    console.log('Hash 2 (Salted): ', hash2);
    console.log('Result: Even with the same password, hashes are different due to unique salts.');

    const isValid = await bcrypt.compare(plainPassword, hash1);
    console.log('Verification:    ', isValid ? '✅ MATCH' : '❌ FAILED');
    console.log('\n');

    // 2. Data Encryption at Rest (AES-256-CBC)
    console.log('--- 2. DATA ENCRYPTION (AES-256-CBC) ---');
    const sensitiveData = 'CONfidential: Project Antigravity Schematics';
    const dataBuffer = Buffer.from(sensitiveData);

    const encryptedBuffer = encryptFile(dataBuffer);
    const decryptedBuffer = decryptFile(encryptedBuffer);

    console.log('Plain Text:     ', sensitiveData);
    console.log('Encrypted (Hex):', encryptedBuffer.toString('hex').substring(0, 64) + '...');
    console.log('Decrypted Text: ', decryptedBuffer.toString());
    console.log('Result:          ' + (sensitiveData === decryptedBuffer.toString() ? '✅ SUCCESS' : '❌ FAILED'));
    console.log('\n');

    // 3. Digital Signatures (RSA-SHA256)
    console.log('--- 3. DIGITAL SIGNATURES (RSA-2048 / SHA-256) ---');
    const documentContent = 'Approved by Manager: Authentication flow version 2.1';
    const docHash = generateHash(documentContent);
    const signature = signData(documentContent);
    const isVerified = verifySignature(documentContent, signature);

    console.log('Document Text:   ', documentContent);
    console.log('SHA-256 Hash:    ', docHash);
    console.log('RSA Signature:   ', signature.substring(0, 64) + '...');
    console.log('Verification:    ', isVerified ? '✅ VERIFIED' : '❌ FAILED');

    const tamperedContent = documentContent + ' [TAMPERED]';
    const isTamperVerified = verifySignature(tamperedContent, signature);
    console.log('Tamper Check:    ', isTamperVerified ? '❌ FAILED (Tamper not detected)' : '✅ SUCCESS (Signature rejected)');

    console.log('\n' + '='.repeat(60));
    console.log('🛡️  VERIFICATION COMPLETE');
    console.log('='.repeat(60) + '\n');
}

runVerification().catch(err => {
    console.error('❌ Verification failed:', err);
});
