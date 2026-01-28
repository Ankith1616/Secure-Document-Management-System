const fs = require('fs');
const path = require('path');
const { encryptData, decryptData, encryptKey, decryptKey, signData, generateHash, generateRSAKeys, verifySignature } = require('../utils/crypto');

// Ensure system keys exist
const KEY_DIR = path.join(__dirname, '../config');
const PRIVATE_KEY_PATH = path.join(KEY_DIR, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEY_DIR, 'public.pem');

if (!fs.existsSync(KEY_DIR)) fs.mkdirSync(KEY_DIR, { recursive: true });
if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    const keys = generateRSAKeys();
    fs.writeFileSync(PRIVATE_KEY_PATH, keys.privateKey);
    fs.writeFileSync(PUBLIC_KEY_PATH, keys.publicKey);
}

const SYSTEM_PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
const SYSTEM_PUBLIC_KEY = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');

const DOCS_FILE = path.join(__dirname, '../data/documents.json');
const getDocs = () => {
    try {
        if (!fs.existsSync(DOCS_FILE)) return [];
        return JSON.parse(fs.readFileSync(DOCS_FILE));
    } catch (e) { return []; }
};
const saveDocs = (docs) => fs.writeFileSync(DOCS_FILE, JSON.stringify(docs, null, 2));

exports.uploadDocument = (req, res) => {
    // req.file is from multer
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const fileBuffer = fs.readFileSync(req.file.path);

        // 1. Hash & Sign (Integrity)
        const hash = generateHash(fileBuffer);
        const signature = signData(fileBuffer, SYSTEM_PRIVATE_KEY);

        // 2. Encrypt (Confidentiality)
        const { encryptedData, iv, key } = encryptData(fileBuffer);

        // 3. Encrypt AES Key
        const encryptedKey = encryptKey(key, SYSTEM_PUBLIC_KEY);

        // 4. Save Encrypted File
        const docId = Date.now().toString();
        // Ensure uploads dir
        if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
        const encFilePath = path.join('uploads', `${docId}.enc`);

        fs.writeFileSync(encFilePath, encryptedData);

        // 5. Cleanup original temp upload
        fs.unlinkSync(req.file.path);

        // 6. Save Metadata
        const newDoc = {
            id: docId,
            originalName: req.file.originalname,
            ownerId: req.user.id,
            ownerName: req.user.username,
            path: encFilePath,
            iv: iv, // base64
            encryptedKey: encryptedKey, // base64
            signature: signature, // base64
            hash: hash, // hex
            createdAt: new Date().toISOString()
        };

        const docs = getDocs();
        docs.push(newDoc);
        saveDocs(docs);

        res.status(201).json({ message: 'Document uploaded and secured', docId });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.getAllDocuments = (req, res) => {
    const docs = getDocs();
    if (req.user.role === 'employee') {
        const myDocs = docs.filter(d => d.ownerId === req.user.id);
        return res.json(myDocs);
    }
    res.json(docs);
};

exports.downloadDocument = (req, res) => {
    const docs = getDocs();
    const doc = docs.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // RBAC check again for safety (though middleware handles basic access)
    // If employee, must be owner
    if (req.user.role === 'employee' && doc.ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied to this document' });
    }

    try {
        const encryptedContent = fs.readFileSync(doc.path, 'utf8');
        const aesKeyBuffer = decryptKey(doc.encryptedKey, SYSTEM_PRIVATE_KEY);
        const decryptedBuffer = decryptData(encryptedContent, aesKeyBuffer, doc.iv);

        // Integrity Check
        const isValid = verifySignature(decryptedBuffer, doc.signature, SYSTEM_PUBLIC_KEY);

        res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}"`);
        res.set('X-Integrity-Check', isValid ? 'PASS' : 'FAIL');
        res.send(decryptedBuffer);

    } catch (err) {
        res.status(500).json({ error: 'Decryption failed: ' + err.message });
    }
};

exports.verifyDocument = (req, res) => {
    const docs = getDocs();
    const doc = docs.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // RBAC check
    if (req.user.role === 'employee' && doc.ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const encryptedContent = fs.readFileSync(doc.path, 'utf8');
        const aesKeyBuffer = decryptKey(doc.encryptedKey, SYSTEM_PRIVATE_KEY);
        const decryptedBuffer = decryptData(encryptedContent, aesKeyBuffer, doc.iv);
        const isValid = verifySignature(decryptedBuffer, doc.signature, SYSTEM_PUBLIC_KEY);

        res.json({
            valid: isValid,
            hashComp: { stored: doc.hash, computed: generateHash(decryptedBuffer) }
        });
    } catch (err) {
        res.status(500).json({ valid: false, error: err.message });
    }
};
