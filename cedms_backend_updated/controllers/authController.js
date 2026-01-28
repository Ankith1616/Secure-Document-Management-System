const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { SECRET_KEY } = require('../middleware/authMiddleware');

const USERS_FILE = path.join(__dirname, '../data/users.json');

// Helper to handle empty file or init
const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
};

const saveUsers = (users) => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

exports.register = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const users = getUsers();

        if (users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now().toString(),
            username,
            password: hashedPassword,
            role: role || 'employee', // Default role
            otp: null,
            otpExpires: null
        };

        users.push(newUser);
        saveUsers(users);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = getUsers();
        const user = users.find(u => u.username === username);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 300000; // 5 mins

        saveUsers(users);

        // Log OTP to server console for simulation
        console.log(`\n[SECURE OTP] For user '${username}': ${otp}\n`);

        res.json({ message: 'OTP generated. Check console.', step: 'otp_required', userId: user.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.verifyOTP = (req, res) => {
    try {
        const { userId, otp } = req.body;
        const users = getUsers();
        const user = users.find(u => u.id === userId);

        if (!user) return res.status(400).json({ error: 'User not found' });

        if (user.otp !== otp || Date.now() > user.otpExpires) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Clear OTP
        user.otp = null;
        user.otpExpires = null;
        saveUsers(users);

        // Generate JWT
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token, role: user.role, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
