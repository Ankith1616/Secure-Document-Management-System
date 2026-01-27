const express = require("express");
const cors = require("cors");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");
const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = "cedms_secret_key";
const USERS_FILE = "./users.json";

/* ===============================
   IN-MEMORY DOCUMENT STORE
================================ */
let documents = [];

/* ===============================
   LOAD & SAVE USERS
================================ */
const loadUsers = () => {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
};

const saveUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

/* ===============================
   JWT MIDDLEWARE
================================ */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token missing" });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = decoded; // { username, role }
    next();
  });
};

/* ===============================
   LOGIN
================================ */
const bcrypt = require("bcrypt");

app.post("/login", async (req, res) => {
  const { employeeId, password } = req.body;

  if (!employeeId || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const users = loadUsers();
  const user = users.find((u) => u.id === employeeId);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // ✅ Compare hashed password
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { username: user.id, role: user.role },
    SECRET_KEY,
    { expiresIn: "1h" }
  );

  res.json({ token, role: user.role });
});


/* ===============================
  SIGNUP
================================ */
app.post("/signup", async (req, res) => {
  const { employeeId, password } = req.body;

  if (!employeeId || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const users = loadUsers();
  if (users.find(u => u.id === employeeId)) {
    return res.status(409).json({ error: "User already exists" });
  }

  let role;
  if (employeeId.startsWith("EMP")) role = "EMPLOYEE";
  else if (employeeId.startsWith("MA")) role = "MANAGER";
  else if (employeeId.startsWith("AD")) role = "ADMIN";
  else return res.status(400).json({ error: "Invalid ID format" });

  const hashedPassword = await bcrypt.hash(password, 10);

  users.push({ id: employeeId, password: hashedPassword, role });
  saveUsers(users);

  res.json({ message: "User registered successfully", role });
});

/* ===============================
   FILE STORAGE (MULTER)
================================ */
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* ===============================
   UPLOAD DOCUMENT (ALL ROLES)
================================ */
app.post("/upload", verifyToken, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "File missing" });
  }

  const doc = {
  id: Date.now(),
  name: req.file.originalname,
  path: req.file.path,
  uploadedBy: req.user.username,
  role: req.user.role,
  status: "PENDING",

  uploadedAt: new Date().toLocaleString(),     // for display
  uploadedDate: new Date().toISOString().split("T")[0], // for search

  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
};



  documents.push(doc);

  res.json({ message: "File uploaded successfully", doc });
});

/* ===============================
   GET DOCUMENTS
================================ */
app.get("/documents", verifyToken, (req, res) => {
  res.json(documents);
});

/* ===============================
   APPROVE / REJECT (MANAGER & ADMIN ONLY)
================================ */
app.put("/documents/:id/status", verifyToken, (req, res) => {
  if (req.user.role !== "MANAGER" && req.user.role !== "ADMIN") {
    return res
      .status(403)
      .json({ error: "Only Manager/Admin can approve or reject" });
  }

  const { status } = req.body;
  const doc = documents.find((d) => d.id == req.params.id);

  if (!doc) {
    return res.status(404).json({ error: "Document not found" });
  }

  if (status === "APPROVED") {
    doc.status = "APPROVED";
    doc.approvedBy = req.user.username;
    doc.approvedAt = new Date().toLocaleString();

    doc.rejectedBy = null;
    doc.rejectedAt = null;
  }

  if (status === "REJECTED") {
    doc.status = "REJECTED";
    doc.rejectedBy = req.user.username;
    doc.rejectedAt = new Date().toLocaleString();

    doc.approvedBy = null;
    doc.approvedAt = null;
  }

  res.json(doc);
});

/* ===============================
   DOWNLOAD DOCUMENT (ONLY IF APPROVED)
================================ */

app.get("/download/:id", verifyToken, (req, res) => {
  const doc = documents.find(d => d.id == req.params.id);

  if (!doc) {
    return res.status(404).json({ error: "Document not found" });
  }

  // ✅ Only APPROVED documents can be downloaded
  if (doc.status !== "APPROVED") {
    return res.status(403).json({ error: "Document not approved" });
  }

  // ✅ Check file exists
  if (!fs.existsSync(doc.path)) {
    return res.status(404).json({ error: "File not found on server" });
  }

  res.download(path.resolve(doc.path), doc.name);
});



/* ===============================
   TEST ROUTE
================================ */
app.get("/", (req, res) => {
  res.send("✅ CEDMS backend running");
});

/* ===============================
   START SERVER
================================ */
app.listen(5000, () => {
  console.log("✅ CEDMS Backend running on port 5000");
});
