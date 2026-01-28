const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../../data/users.json');
const DOCS_FILE = path.join(__dirname, '../../data/docs.json');
const AUDIT_FILE = path.join(__dirname, '../../data/audit_logs.json');

/**
 * Initialize data files
 */
function initDataFiles() {
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
    }

    if (!fs.existsSync(DOCS_FILE)) {
        fs.writeFileSync(DOCS_FILE, JSON.stringify([], null, 2));
    }

    if (!fs.existsSync(AUDIT_FILE)) {
        fs.writeFileSync(AUDIT_FILE, JSON.stringify([], null, 2));
    }
}

/**
 * Read users from JSON file
 */
function getUsers() {
    initDataFiles();
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
}

/**
 * Write users to JSON file
 */
function saveUsers(users) {
    initDataFiles();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

/**
 * Find user by username
 */
function findUserByUsername(username) {
    const users = getUsers();
    return users.find(u => u.username === username);
}

/**
 * Find user by ID
 */
function findUserById(id) {
    const users = getUsers();
    return users.find(u => u.id === id);
}

/**
 * Add new user
 */
function addUser(user) {
    const users = getUsers();
    users.push(user);
    saveUsers(users);
}

/**
 * Read documents from JSON file
 */
function getDocuments() {
    initDataFiles();
    const data = fs.readFileSync(DOCS_FILE, 'utf8');
    return JSON.parse(data);
}

/**
 * Write documents to JSON file
 */
function saveDocuments(docs) {
    initDataFiles();
    fs.writeFileSync(DOCS_FILE, JSON.stringify(docs, null, 2));
}

/**
 * Find document by ID
 */
function findDocumentById(id) {
    const docs = getDocuments();
    return docs.find(d => d.id === id);
}

/**
 * Add new document
 */
function addDocument(doc) {
    const docs = getDocuments();
    docs.push(doc);
    saveDocuments(docs);
}

/**
 * Update document
 */
function updateDocument(id, updates) {
    const docs = getDocuments();
    const index = docs.findIndex(d => d.id === id);
    if (index !== -1) {
        docs[index] = { ...docs[index], ...updates };
        saveDocuments(docs);
        return docs[index];
    }
    return null;
}

/**
 * Remove document
 */
function removeDocument(id) {
    const docs = getDocuments();
    const filteredDocs = docs.filter(d => d.id !== id);
    if (docs.length !== filteredDocs.length) {
        saveDocuments(filteredDocs);
        return true;
    }
    return false;
}

/**
 * Update user
 */
function updateUser(id, updates) {
    const users = getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        saveUsers(users);
        return users[index];
    }
    return null;
}

module.exports = {
    initDataFiles,
    getUsers,
    saveUsers,
    findUserByUsername,
    findUserById,
    addUser,
    updateUser,
    getDocuments,
    saveDocuments,
    findDocumentById,
    addDocument,
    updateDocument,
    removeDocument,
    AUDIT_FILE
};
